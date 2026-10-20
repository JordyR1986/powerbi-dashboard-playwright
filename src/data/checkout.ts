export const customer = {
  firstName: 'Riley',
  lastName: 'Quinn',
  postalCode: '10001',
} as const;

export const checkoutCopy = {
  firstNameRequired: 'Error: First Name is required',
  payment: 'SauceCard #31337',
  shipping: 'Free Pony Express Delivery!',
  completeHeader: 'Thank you for your order!',
  completeText:
    'Your order has been dispatched, and will arrive just as fast as the pony can get there!',
} as const;
