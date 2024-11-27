const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://pejtwqqqwpgsmrwtmibt.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBlanR3cXFxd3Bnc21yd3RtaWJ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzAzOTY2MTAsImV4cCI6MjA0NTk3MjYxMH0.0yYoxD41BrrLjE2YBDZC51VGHzVZlIfwlfI4ZzMLb64'; // Replace with your actual Supabase anon key
const supabase = createClient(supabaseUrl, supabaseKey);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware for parsing JSON and form data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session setup
app.use(session({
    secret: 'your-secret-key',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } // Set to true if using HTTPS
}));

// Serve static files from the "public" directory
app.use(express.static(path.join(__dirname, 'public')));

// Root route to serve signup.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'signup.html'));
});

// Hash password
async function hashPassword(password) {
    const saltRounds = 10;
    return await bcrypt.hash(password, saltRounds);
}

// Signup route
app.post('/signup', async (req, res) => {
    const { fullName, email, password } = req.body;

    // Hash the password before storing
    const hashedPassword = await hashPassword(password);

    try {
        const { data, error } = await supabase
            .from('users')
            .insert([{
                full_name: fullName,
                email: email,
                password: hashedPassword
            }]);

        if (error) {
            console.error('Error signing up:', error);
            return res.status(500).json({ error: 'Signup failed' });
        }

        res.status(201).json({ message: 'Signup successful!' });
    } catch (error) {
        console.error('Error processing signup:', error);
        res.status(500).json({ error: 'Error processing request.' });
    }
});

// Example login route
// ... existing code ...
app.post('/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        // Fetch user from the database
        const { data: user, error } = await supabase
            .from('users')
            .select('*')
            .eq('email', username)
            .single();

        if (error || !user) {
            return res.redirect('/login.html'); // Redirect to login.html on invalid credentials
        }

        // Compare the password with the hashed password
        const match = await bcrypt.compare(password, user.password);
        if (!match) {
            return res.redirect('/login.html'); // Redirect to login.html on invalid credentials
        }

        // Store user ID and name in session
        req.session.userId = user.id;
        req.session.userName = user.full_name;

        // If login is successful, redirect to home.html
        res.redirect('/home.html'); // Ensure this path is correct
    } catch (error) {
        console.error('Error during login:', error);
        res.status(500).json({ error: 'Error processing request.' });
    }
});
// ... existing code ...

// Example logout route
app.get('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return res.status(500).send('Error logging out.');
        }
        res.redirect('/login.html');
    });
});

// Middleware to check if user is logged in
function isAuthenticated(req, res, next) {
    if (req.session && req.session.userId) {
        return next();
    }
    res.redirect('/login.html'); // Redirect to login if not authenticated
}

// ... existing code ...

app.post('/book-service', isAuthenticated, async (req, res) => {
    const { serviceType, petName, petType, startDate, endDate, timeSlot, specialInstructions } = req.body;
    const userId = req.session.userId; // Retrieve userId from session

    try {
        const { data, error } = await supabase
            .from('services')
            .insert([{
                user_id: userId,
                service_type: serviceType,
                pet_name: petName,
                pet_type: petType,
                start_date: startDate,
                end_date: endDate,
                time_slot: timeSlot,
                special_instructions: specialInstructions
            }]);

        if (error) {
            console.error('Error booking service:', error);
            return res.status(500).json({ error: 'Booking failed' });
        }

        // Send a success response
        res.status(201).json({ message: 'Service booked successfully!' });
    } catch (error) {
        console.error('Error processing booking:', error);
        res.status(500).json({ error: 'Error processing request.' });
    }
});

// Route to get user details
app.get('/user-profile', isAuthenticated, async (req, res) => {
    const userId = req.session.userId; // Retrieve userId from session

    try {
        const { data: user, error } = await supabase
            .from('users')
            .select('full_name, email')
            .eq('id', userId)
            .single();

        if (error || !user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json(user);
    } catch (error) {
        console.error('Error fetching user details:', error);
        res.status(500).json({ error: 'Error processing request.' });
    }
});

// Route to get user services (booking history)
app.get('/user-services', isAuthenticated, async (req, res) => {
    const userId = req.session.userId; // Retrieve userId from session

    try {
        const { data: services, error } = await supabase
            .from('services')
            .select('service_type, pet_name, pet_type, start_date, end_date, time_slot, special_instructions')
            .eq('user_id', userId);

        if (error) {
            console.error('Error fetching services:', error);
            return res.status(500).json({ error: 'Failed to fetch services' });
        }

        res.json(services);
    } catch (error) {
        console.error('Error processing request:', error);
        res.status(500).json({ error: 'Error processing request.' });
    }
});

// Admin login route
app.post('/admin-login', async (req, res) => {
    const { username, password } = req.body;

    const hardcodedEmail = 'admin@gmail.com'; // Replace with an actual email
    const hardcodedPassword = 'admin123'; // Replace with the actual password

    if (username === hardcodedEmail && password === hardcodedPassword) {
        // Simulate successful login
        req.session.adminId = 1; // Set a dummy admin ID
        return res.redirect('/admin-dashboard.html');
    } else {
        return res.status(401).json({ error: 'Invalid email or password' });
    }
});

// Route to get the number of bookings
app.get('/api/booking-count', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('services')
            .select('id', { count: 'exact' }); // Get the count of bookings

        if (error) {
            console.error('Error fetching booking count:', error);
            return res.status(500).json({ error: 'Failed to fetch booking count' });
        }

        res.json({ count: data.length }); // Return the count of bookings
    } catch (error) {
        console.error('Error processing request:', error);
        res.status(500).json({ error: 'Error processing request.' });
    }
});

// Route to get the total number of users
app.get('/api/total-users', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('users')
            .select('id', { count: 'exact' }); // Get the count of users

        if (error) {
            console.error('Error fetching user count:', error);
            return res.status(500).json({ error: 'Failed to fetch user count' });
        }

        res.json({ count: data.length }); // Return the count of users
    } catch (error) {
        console.error('Error processing request:', error);
        res.status(500).json({ error: 'Error processing request.' });
    }
});

// Route to get recent bookings
app.get('/api/recent-bookings', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('services')
            .select('user_id, service_type, pet_name, start_date, special_instructions')
            .order('created_at', { ascending: false })
            .limit(10); // Adjust the limit as needed

        if (error) {
            console.error('Error fetching recent bookings:', error);
            return res.status(500).json({ error: 'Failed to fetch recent bookings' });
        }

        // Fetch user details for each booking
        const bookingsWithUserDetails = await Promise.all(data.map(async (booking) => {
            const { data: user, error: userError } = await supabase
                .from('users')
                .select('full_name')
                .eq('id', booking.user_id)
                .single();

            if (userError) {
                console.error('Error fetching user details:', userError);
                return null; // Handle error appropriately
            }

            return {
                user: user.full_name, // Add user name to the booking data
                ...booking
            };
        }));

        res.json(bookingsWithUserDetails.filter(Boolean)); // Filter out any null values
    } catch (error) {
        console.error('Error processing request:', error);
        res.status(500).json({ error: 'Error processing request.' });
    }
});

// Route to get booking details by ID
app.get('/api/booking-details', async (req, res) => {
    const bookingId = req.query.id;

    try {
        const { data, error } = await supabase
            .from('services')
            .select('special_instructions')
            .eq('id', bookingId)
            .single();

        if (error || !data) {
            return res.status(404).json({ error: 'Booking not found' });
        }

        res.json(data); // Return the booking details
    } catch (error) {
        console.error('Error fetching booking details:', error);
        res.status(500).json({ error: 'Error processing request.' });
    }
});

// Route to delete a booking by ID
// Route to delete a booking by ID
app.delete('/api/delete-booking', async (req, res) => {
    const bookingId = req.query.id;

    try {
        const { data, error } = await supabase
            .from('services')
            .delete()
            .eq('id', bookingId);

        if (error) {
            console.error('Error deleting booking:', error);
            return res.status(500).json({ error: 'Failed to delete booking' });
        }

        res.status(204).send(); // No content to send back
    } catch (error) {
        console.error('Error processing request:', error);
        res.status(500).json({ error: 'Error processing request.' });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});