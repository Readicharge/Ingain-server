/**
 * Category Model - INGAIN Platform
 * 
 * This model represents app categories for organizing and filtering apps
 * in the INGAIN catalog. Categories help users discover relevant apps.
 * 
 * @author Yash Singh (ER_SKY)
 * @version 1.0.0
 */

const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
    unique_id: {
        type: String,
        required: true,
        unique: true,
        default: () => require('uuid').v4()
    },
    name: {
        type: String,
        required: [true, 'Category name is required'],
        trim: true,
        maxlength: [100, 'Category name cannot exceed 100 characters'],
        unique: true
    },
    description: {
        type: String,
        trim: true,
        maxlength: [500, 'Category description cannot exceed 500 characters']
    },
    slug: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    icon: {
        type: String,
        validate: {
            validator: function(v) {
                return !v || /^https?:\/\/.+/.test(v);
            },
            message: 'Category icon must be a valid URL'
        }
    },
    color: {
        type: String,
        default: '#3B82F6',
        validate: {
            validator: function(v) {
                return /^#[0-9A-F]{6}$/i.test(v);
            },
            message: 'Color must be a valid hex color code'
        }
    },
    parent_category: {
        type: String,
        ref: 'Category',
        default: null
    },
    subcategories: [{
        type: String,
        ref: 'Category'
    }],
    is_active: {
        type: Boolean,
        default: true
    },
    is_featured: {
        type: Boolean,
        default: false
    },
    sort_order: {
        type: Number,
        default: 0
    },
    app_count: {
        type: Number,
        default: 0,
        min: 0
    },
    total_shares: {
        type: Number,
        default: 0,
        min: 0
    },
    created_at: {
        type: Date,
        default: Date.now
    },
    updated_at: {
        type: Date,
        default: Date.now
    },
    created_by: {
        type: String,
        ref: 'AdminUser'
    }
}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Virtual for full category path
categorySchema.virtual('full_path').get(function() {
    if (this.parent_category) {
        return `${this.parent_category} > ${this.name}`;
    }
    return this.name;
});

// Virtual for total subcategories
categorySchema.virtual('subcategory_count').get(function() {
    return this.subcategories ? this.subcategories.length : 0;
});

// Indexes for better performance
categorySchema.index({ name: 1 });
categorySchema.index({ slug: 1 });
categorySchema.index({ is_active: 1 });
categorySchema.index({ is_featured: 1 });
categorySchema.index({ parent_category: 1 });
categorySchema.index({ sort_order: 1 });

// Pre-save middleware to generate slug if not provided
categorySchema.pre('save', function(next) {
    if (!this.slug) {
        this.slug = this.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    }
    this.updated_at = new Date();
    next();
});

// Static method to find active categories
categorySchema.statics.findActive = function() {
    return this.find({ is_active: true }).sort({ sort_order: 1, name: 1 });
};

// Static method to find featured categories
categorySchema.statics.findFeatured = function() {
    return this.find({ is_active: true, is_featured: true }).sort({ sort_order: 1, name: 1 });
};

// Static method to find categories by parent
categorySchema.statics.findByParent = function(parentId) {
    return this.find({ parent_category: parentId, is_active: true }).sort({ sort_order: 1, name: 1 });
};

// Static method to find root categories (no parent)
categorySchema.statics.findRootCategories = function() {
    return this.find({ parent_category: null, is_active: true }).sort({ sort_order: 1, name: 1 });
};

// Instance method to get category hierarchy
categorySchema.methods.getHierarchy = async function() {
    const hierarchy = [this];
    let currentCategory = this;
    
    while (currentCategory.parent_category) {
        const parent = await mongoose.model('Category').findOne({ unique_id: currentCategory.parent_category });
        if (parent) {
            hierarchy.unshift(parent);
            currentCategory = parent;
        } else {
            break;
        }
    }
    
    return hierarchy;
};

// Instance method to get all subcategories recursively
categorySchema.methods.getAllSubcategories = async function() {
    const subcategories = [];
    
    if (this.subcategories && this.subcategories.length > 0) {
        for (const subId of this.subcategories) {
            const subcategory = await mongoose.model('Category').findOne({ unique_id: subId });
            if (subcategory) {
                subcategories.push(subcategory);
                const nestedSubs = await subcategory.getAllSubcategories();
                subcategories.push(...nestedSubs);
            }
        }
    }
    
    return subcategories;
};

// Instance method to update app count
categorySchema.methods.updateAppCount = async function() {
    const App = mongoose.model('App');
    this.app_count = await App.countDocuments({ 
        categories: this.unique_id, 
        is_active: true 
    });
    return this.save();
};

// Instance method to get category statistics
categorySchema.methods.getStatistics = async function() {
    const App = mongoose.model('App');
    const apps = await App.find({ categories: this.unique_id, is_active: true });
    
    const totalShares = apps.reduce((sum, app) => sum + (app.total_shared || 0), 0);
    const totalXp = apps.reduce((sum, app) => sum + (app.total_xp_allocated || 0), 0);
    const totalPoints = apps.reduce((sum, app) => sum + (app.total_points_allocated || 0), 0);
    
    return {
        category_id: this.unique_id,
        category_name: this.name,
        app_count: this.app_count,
        total_shares: totalShares,
        total_xp_allocated: totalXp,
        total_points_allocated: totalPoints,
        average_shares_per_app: this.app_count > 0 ? totalShares / this.app_count : 0
    };
};

const Category = mongoose.models.Category || mongoose.model('Category', categorySchema);

module.exports = Category; 