const argon2 = require('argon2');

const ARGON2_OPTIONS = {
    type: argon2.argon2id,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 1,
};

function getPepper() {
    const pepper = process.env.PASSWORD_PEPPER;
    if (!pepper || pepper.length < 32) {
        throw new Error('PASSWORD_PEPPER env var is missing or too short (min 32 chars)');
    }
    return pepper;
}

function applyPepper(password) {
    return password + getPepper();
}

async function hashPassword(plaintext) {
    return argon2.hash(applyPepper(plaintext), ARGON2_OPTIONS);
}

async function verifyPassword(plaintext, hash) {
    if (!hash || !hash.startsWith('$argon2')) {
        return false;
    }
    return argon2.verify(hash, applyPepper(plaintext));
}

module.exports = { hashPassword, verifyPassword };