const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const app = express();
const PORT = process.env.PORT || 3000;

// MongoDB connection
mongoose.connect('mongodb+srv://jefrinjohnson:platypusswaha123@cluster0.vutfd0p.mongodb.net/ecommerce');

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));

// Product schema
const productSchema = new mongoose.Schema({
    productId : String,
    name: String,
    description: String,
    slug: String,
    price: Number,
    regular_price: Number,
    sale_price: Number,
    stock_quantity: Number,
    images: String
});
const Product = mongoose.model('Product', productSchema);

// User schema for authentication
const userSchema = new mongoose.Schema({
    userID: { type: String, unique: true, default: uuidv4 },
    mobile: { type: String, unique: true, required: true },
    password: { type: String, required: true },
});
const User = mongoose.model('User', userSchema);

const tokenBlacklistSchema = new mongoose.Schema({
    token: { type: String, required: true },
    created_at: { type: Date, default: Date.now }
});

const TokenBlacklist = mongoose.model('TokenBlacklist', tokenBlacklistSchema);

app.use(bodyParser.json());

// Register user
app.post('/register', async (req, res) => {
    const { mobile, password } = req.body;

    try {
        const existingUser = await User.findOne({ mobile });
        if (existingUser) {
            return res.status(400).json({
                meta: {
                    status: "false",
                    statusCode: 400,
                    message: "User already exists",
                },
                values: null,
            });
        }

        // Create a new user with a unique `userID`
        const user = new User({ mobile, password, userID: uuidv4() });
        await user.save();

        // Create JWT with `userID` and `mobile`
        const token = jwt.sign({ userID: user.userID, mobile: user.mobile }, 'secret_key', {
            expiresIn: '9999h',
        });

        return res.status(201).json({
            meta: {
                status: "true",
                statusCode: res.statusCode,
                message: "User registered successfully",
            },
            values: {
                userID: user.userID,
                mobile: user.mobile,
                token: token,
            },
        });
    } catch (error) {
        return res.status(500).json({
            meta: {
                status: "false",
                statusCode: 500,
                message: error.message,
            },
            values: null,
        });
    }
});


// Login and get token
app.post('/login', async (req, res) => {
    const { mobile, password } = req.body;
    try {
        const user = await User.findOne({ mobile, password });
        if (!user) {
            const response = {
                meta: {
                    status: "false",
                    statusCode: 401,
                    message: 'Invalid username or password',
                },
                values: null,
            };
            return res.status(401).json(response);
        }

        // Create JWT with userID and mobile
        const token = jwt.sign({ userID: user.userID, mobile: user.mobile }, 'secret_key', {
            expiresIn: '9999h', // or any other suitable expiration
        });
    console.log("<<<<<<<<<<<<<<<<<",user.userID);
        const response = {
            meta: {
                status: "true",
                statusCode: 200,
                message: "Login successful",
            },
            values: {
                userID: user.userID, // Include userID in response
                mobile: user.mobile,
                token: token,
            },
        };
        res.json(response);
    } catch (error) {
        const response = {
            meta: {
                status: "false",
                statusCode: 500,
                message: 'An error occurred while logging in.',
            },
            values: null,
        };
        res.status(500).json(response);
    }
});

// Logout and remove token
app.post('/logout', authenticateToken, async (req, res) => {
    const token = req.headers['authorization'].split(' ')[1];

    try {
        const blacklistEntry = new TokenBlacklist({ token });
        await blacklistEntry.save();

        const response = {
            meta: {
                status: "true",
                statusCode: res.statusCode,
                message: "Logout successful"
            },
            values: null
        };
        res.json(response);
    } catch (err) {
        const response = {
            meta: {
                status: "false",
                statusCode: 500,
                message: "Error during logout",
            },
            values: null
        };
        res.status(500).json(response);
    }
});


// Middleware to verify token
async function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    if (!authHeader) {
        const response = {
            meta: {
                status: "false",
                    statusCode: 401,
                    message: 'Authorization header is missing',
            },
            values: null
        };
        return res.status(401).json(response);
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
        const response = {
            meta: {
                status: "false",
                statusCode: 401,
                message: 'Token not provided',
            },
            values: null
        };
        return res.status(401).json(response);
    }

    // Check if the token is blacklisted
    const isBlacklisted = await TokenBlacklist.findOne({ token });
    if (isBlacklisted) {
        const response = {
            meta: {
                status: "false",
                statusCode: 403,
                message: 'Token is invalid or expired',
            },
            values: null
        };
        return res.status(403).json(response);
    }

    jwt.verify(token, 'secret_key', (err, user) => {
        if (err) {
            const response = {
                meta: {
                    status: "false",
                    statusCode: 403,
                    message: 'Invalid token',
            },
            values: null
        };
            return res.status(403).json(response);
        }

        req.user = user;
        next();
    });
}


// function authenticateToken(req, res, next) {
//     // Check if the Authorization header exists
//     const authHeader = req.headers['authorization'];
//     if (!authHeader) {
//         const response = {
//             meta: {
//                 status: "false",
//                 statusCode: 401,
//                 message: 'Authorization header is missing'
//             },
//             values: null
//         };
//         return res.status(401).json(response);
//     }

//     // Extract the token from the Authorization header
//     const token = authHeader.split(' ')[1];
//     if (!token) {
//         const response = {
//             meta: {
//                 status: "false",
//                 statusCode: 401,
//                 message: 'Token not provided'
//             },
//             values: null
//         };
//         return res.status(401).json(response);
//     }

//     // Verify the token
//     jwt.verify(token, 'secret_key', (err, user) => {
//         if (err) {
//             const response = {
//                 meta: {
//                     status: "false",
//                     statusCode: 403,
//                     message: 'Invalid token'
//                 },
//                 values: null
//             };
//             return res.status(403).json(response);
//         }
//         // If token is valid, attach the user information to the request object
//         req.user = user;
//         next();
//     });
// }



// GET all products (protected route)
app.get('/allproducts', authenticateToken, async (req, res) => {
    try {
        const products = await Product.find();
        const response = {
            meta: {
                status: "true",
                statusCode: res.statusCode,
                message: "Products fetched successfully"
            },
            values: products
        };
        res.json(response);
    } catch (err) {
        const response = {
            meta: {
                status: "false",
                statusCode: 500,
                message: err.message
            },
            values: null
        };
        res.status(500).json(response);
    }
});

// GET a single product by ID (protected route)
app.get('/products/:id', authenticateToken, getProduct, (req, res) => {
    const response = {
        meta: {
            status: "true",
            statusCode: res.statusCode,
            message: "Product fetched successfully"
        },
        values: res.product
    };
    res.json(response);
});


// POST a list of products (protected route)
app.post('/products', authenticateToken, async (req, res) => {
    const productList = req.body;  
    const newProducts = [];
    
    try {
        for (const productData of productList) {
            const product = new Product({
                productId:productData.productId,
                name: productData.name,
                price: productData.price,
                description: productData.description,
                slug: productData.slug,
                regular_price: productData.regular_price,
                sale_price: productData.sale_price,
                stock_quantity: productData.stock_quantity,
                images: productData.images
            });
            const newProduct = await product.save();
            newProducts.push(newProduct);
        }
        const response = {
            meta: {
                status: "true",
                statusCode: res.statusCode,
                message: "Products added successfully"
            },
            values: newProducts
        };
        res.status(201).json(response);
    } catch (err) {
        const response = {
            meta: {
                status: "false",
                statusCode: 400,
                message: err.message
            },
            values: null
        };
        res.status(400).json(response);
    }
});

// Middleware to get product by ID
async function getProduct(req, res, next) {
    let product;
    try {
        product = await Product.findById(req.params.id);
        if (product == null) {
            const response = {
                meta: {
                    status: "false",
                    statusCode: 404,
                    message: 'Product not found'
                },
                values: null
            };
            return res.status(404).json(response);
        }
    } catch (err) {
        const response = {
            meta: {
                status: "false",
                statusCode: 500,
                message: err.message
            },
            values: null
        };
        return res.status(500).json(response);
    }
    res.product = product;
    next();
}



// app.listen(5002, "localhost", () => {
//     console.log("Server is listening on localhost:5002");
//   });
  
app.listen(5002,"192.168.0.103", () => {
    console.log(`Server is listening on port ${5002,"192.168.0.103"}`);
});
