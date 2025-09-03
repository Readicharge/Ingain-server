const mongoose = require("mongoose");

const appSchema = new mongoose.Schema({
    unique_id: { type: String, required: true, unique: true },
    app_name: { type: String, required: true },
    app_description: { type: String },
    app_logo: { type: String },
    app_xp: { type: Number, default: 0 },
    app_points: { type: Number, default: 0 },
    categories: [{ type: String }],
    total_shared: { type: Number, default: 0 },
    total_xp_allocated: { type: Number, default: 0 },
    total_points_allocated: { type: Number, default: 0 },
    total_xp_spent: { type: Number, default: 0 },
    total_points_spent: { type: Number, default: 0 },
    is_active: { type: Boolean, default: true },
    is_featured: { type: Boolean, default: false },
    geo_availability: [{ type: String, default: [] }],
    host_id: { type: String, required: true },
    share_rules: { type: Object, default: {} },
    tracking_config: { type: Object, default: {} },
    monetization_config: { type: Object, default: {} },
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now },
    created_by: { type: String },
});

const App = mongoose.models.App || mongoose.model("App", appSchema);

module.exports = App;