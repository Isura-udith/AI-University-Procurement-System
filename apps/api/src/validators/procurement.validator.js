/** Procurement Validator */
const validateProcurement = (data) => {
  const errors = [];
  if (!data.title?.trim()) errors.push({ field: 'title', message: 'Title is required' });
  if (!data.description?.trim()) errors.push({ field: 'description', message: 'Description is required' });
  if (!data.category) errors.push({ field: 'category', message: 'Category is required' });
  if (!data.items || data.items.length === 0) errors.push({ field: 'items', message: 'At least one item is required' });
  if (data.items) {
    data.items.forEach((item, i) => {
      if (!item.description) errors.push({ field: `items[${i}].description`, message: 'Item description is required' });
      if (!item.quantity || item.quantity <= 0) errors.push({ field: `items[${i}].quantity`, message: 'Valid quantity is required' });
      if (!item.estimatedUnitPrice || item.estimatedUnitPrice <= 0) errors.push({ field: `items[${i}].estimatedUnitPrice`, message: 'Valid price is required' });
    });
  }
  return { isValid: errors.length === 0, errors };
};
module.exports = { validateProcurement };
