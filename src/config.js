require('dotenv').config();

const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_jwt_key_change_in_production';
const NODE_ENV = process.env.NODE_ENV || 'production';

module.exports = {
    PORT,
    JWT_SECRET,
    NODE_ENV
};

