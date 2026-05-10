/**
 * @file sanitize.js
 * @description Input validation and sanitization utilities
 * @updated 2026-05-10
 */
const logger = require("../services/logger");

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const URL_REGEX = /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&//=]*)$/;
const MAX_STRING_LENGTH = 1000;
const DANGEROUS_PATTERNS = [/<script/gi, /javascript:/gi, /on\w+\s*=/gi, /data:text\/html/gi];

const sanitizeString = (str, maxLength = MAX_STRING_LENGTH) => {
  if (typeof str !== "string") return "";
  let clean = str.trim().slice(0, maxLength);
  clean = clean.replace(/[<>]/g, "");
  DANGEROUS_PATTERNS.forEach((p) => { clean = clean.replace(p, ""); });
  return clean;
};

const validateEmail = (email) => {
  if (!email || typeof email !== "string") return { valid: false, error: "Email is required" };
  const normalized = email.toLowerCase().trim();
  if (!EMAIL_REGEX.test(normalized)) return { valid: false, error: "Invalid email format" };
  if (normalized.length > 254) return { valid: false, error: "Email too long" };
  return { valid: true, value: normalized };
};

const validateUrl = (url) => {
  if (!url || typeof url !== "string") return { valid: false, error: "URL is required" };
  if (!URL_REGEX.test(url)) return { valid: false, error: "Invalid URL format" };
  return { valid: true, value: url };
};

const sanitizeInput = (input, schema = {}) => {
  const result = {};
  const errors = [];
  if (input.email !== undefined) {
    const { valid, value, error } = validateEmail(input.email);
    if (!valid) errors.push(error);
    else result.email = value;
  }
  if (input.name !== undefined) result.name = sanitizeString(input.name, 100);
  if (input.bio !== undefined) result.bio = sanitizeString(input.bio, 500);
  if (input.age !== undefined) {
    const age = parseInt(input.age, 10);
    if (isNaN(age) || age < 0 || age > 150) errors.push("Invalid age");
    else result.age = age;
  }
  if (input.url !== undefined) {
    const { valid, value, error } = validateUrl(input.url);
    if (!valid) errors.push(error);
    else result.url = value;
  }
  if (errors.length > 0) throw new Error("Validation failed: " + errors.join(", "));
  logger.info("Input sanitized", { fields: Object.keys(result) });
  return result;
};

const validateRequired = (obj, fields) => {
  const missing = fields.filter((f) => obj[f] === undefined || obj[f] === null || obj[f] === "");
  if (missing.length > 0) throw new Error("Missing required fields: " + missing.join(", "));
  return true;
};

module.exports = { sanitizeString, validateEmail, validateUrl, sanitizeInput, validateRequired };
// build: 1778410770
