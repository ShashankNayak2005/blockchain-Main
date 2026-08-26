const { BadRequestError } = require("../utils/errors");

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

function validateRegisterInput({ name, email, password }) {
  if (!name || typeof name !== "string" || name.trim().length === 0) {
    throw new BadRequestError("Name is required");
  }

  if (!email || typeof email !== "string" || !EMAIL_REGEX.test(email.trim())) {
    throw new BadRequestError("Valid email address is required");
  }

  if (!password || typeof password !== "string") {
    throw new BadRequestError("Password is required");
  }

  if (password.length < 8) {
    throw new BadRequestError("Password must be at least 8 characters long");
  }

  // Strong password check: Must contain at least one letter and one number or special character
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumberOrSpecial = /[0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);

  if (!hasLetter || !hasNumberOrSpecial) {
    throw new BadRequestError("Password must contain at least one letter and one number or special character");
  }

  return {
    name: name.trim(),
    email: email.trim().toLowerCase(),
    password
  };
}

function validateLoginInput({ email, password }) {
  if (!email || typeof email !== "string" || !EMAIL_REGEX.test(email.trim())) {
    throw new BadRequestError("Valid email address is required");
  }

  if (!password || typeof password !== "string" || password.length === 0) {
    throw new BadRequestError("Password is required");
  }

  return {
    email: email.trim().toLowerCase(),
    password
  };
}

module.exports = {
  validateRegisterInput,
  validateLoginInput
};
