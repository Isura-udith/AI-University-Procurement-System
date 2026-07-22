const mongoose = require('mongoose');
const Bid = require('../apps/api/src/models/bid.model');

async function run() {
  console.log('Bid paths:');
  console.log('documents path:', Bid.schema.paths['documents']);
  console.log('documents instance:', Bid.schema.paths['documents']?.instance);
  console.log('documents caster:', Bid.schema.paths['documents']?.caster);
  
  if (Bid.schema.paths['documents']?.caster) {
    console.log('caster instance:', Bid.schema.paths['documents'].caster.instance);
    console.log('caster options:', Bid.schema.paths['documents'].caster.options);
  }
}

run().catch(console.error);
