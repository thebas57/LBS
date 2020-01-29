const mongoose = require("mongoose");

const schema = new mongoose.Schema({
  ref: { type: String, index: true, unique: true, required: true },
  nom: { type: String, required: true },
  description: { type: String, required: true },
  type_pain: { type: String, text: true },
  image: { type:String },
  categories: { type: String, required: true },
  prix: { type: String, required: true }
});

module.exports = mongoose.model("sandwichs", schema);
