const express = require('express');
const Category = require('../models/Common/Category.js');
const App = require('../models/Common/App.js');

const router = express.Router();

// Get all categories
router.get('/', async (req, res) => {
  try {
    const { active } = req.query;

    const query = {};
    if (active === 'true') {
      query.is_active = true;
    }

    const categories = await Category.find(query).sort({ name: 1 });
    res.json(categories);
  } catch (error) {
    console.error('categoryRoutes.js error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get single category by ID
router.get('/:id', async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }
    res.json(category);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get apps by category
router.get('/:id/apps', async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 10, featured } = req.query;

    const query = {
      categories: id,
      is_active: true
    };
    if (featured === 'true') {
      query.is_featured = true;
    }
    const apps = await App.find(query)
      .sort({ created_at: -1 })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit))
      .exec();
    const total = await App.countDocuments(query);
    res.json({
      apps,
      totalPages: Math.ceil(total / limit),
      currentPage: Number(page),
      total
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get category statistics
router.get('/:id/stats', async (req, res) => {
  try {
    const { id } = req.params;

    const totalApps = await App.countDocuments({
      categories: id,
      is_active: true
    });
    const featuredApps = await App.countDocuments({
      categories: id,
      is_active: true,
      is_featured: true
    });
    // Referral and XP fields may need to be updated to match new schema
    const totalReferrals = await App.aggregate([
      { $match: { categories: id, is_active: true } },
      { $group: { _id: null, total: { $sum: '$total_shared' } } }
    ]);
    const totalXpAwarded = await App.aggregate([
      { $match: { categories: id, is_active: true } },
      { $group: { _id: null, total: { $sum: '$total_xp_allocated' } } }
    ]);
    res.json({
      totalApps,
      featuredApps,
      totalReferrals: totalReferrals[0]?.total || 0,
      totalXpAwarded: totalXpAwarded[0]?.total || 0
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get categories with app counts
router.get('/with-counts/list', async (req, res) => {
  try {
    const categories = await Category.find({ is_active: true }).sort({ name: 1 });
    const categoriesWithCounts = await Promise.all(
      categories.map(async (category) => {
        const appCount = await App.countDocuments({
          categories: category._id,
          is_active: true
        });
        return {
          ...category.toObject(),
          appCount
        };
      })
    );
    res.json(categoriesWithCounts);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router; 