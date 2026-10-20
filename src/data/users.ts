export const users = {
  standard: {
    username: 'standard_user',
    password: 'secret_sauce',
  },
  lockedOut: {
    username: 'locked_out_user',
    password: 'secret_sauce',
  },
  invalid: {
    username: 'not_a_user',
    password: 'wrong_password',
  },
} as const;

export const loginErrors = {
  lockedOut: 'Epic sadface: Sorry, this user has been locked out.',
  mismatch: 'Epic sadface: Username and password do not match any user in this service',
  usernameRequired: 'Epic sadface: Username is required',
} as const;
