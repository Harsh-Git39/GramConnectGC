const express = require('express');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = 3000;

// Middleware
app.use(express.json());
app.use(express.static(__dirname));

const supabaseUrl = 'https://mkszhsttgnzdflckgrwb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1rc3poc3R0Z256ZGZsY2tncndiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcwNzQ5MDEsImV4cCI6MjA3MjY1MDkwMX0.xJqCaTUP5OYWNSwVT5FzKIFUfY902MzstJ5HIsHfE6A';

const supabase = createClient(supabaseUrl, supabaseKey);

// === USER AUTHENTICATION ===

app.post('/api/signup', async (req, res) => {
    try {
        const { name, email, phone, location, userType, password } = req.body;
        
        if (!password) {
            return res.json({ success: false, error: 'Password is required' });
        }
        
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email: email,
            password: password
        });
        
        if (authError) {
            return res.json({ success: false, error: authError.message });
        }
        
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .insert({
                id: authData.user.id,
                name: name,
                email: email,
                phone: phone,
                location: location,
                user_type: userType
            })
            .select()
            .single();
        
        if (profileError) {
            return res.json({ success: false, error: profileError.message });
        }
        
        res.json({
            success: true,
            user: {
                id: profile.id,
                name: profile.name,
                email: profile.email,
                type: profile.user_type,
                location: profile.location
            }
        });
        
    } catch (error) {
        res.json({ success: false, error: error.message });
    }
});

app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
            email: email,
            password: password
        });
        
        if (authError) {
            return res.json({ success: false, error: authError.message });
        }
        
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', authData.user.id)
            .single();
        
        if (profileError) {
            return res.json({ success: false, error: profileError.message });
        }
        
        res.json({
            success: true,
            user: {
                id: profile.id,
                name: profile.name,
                email: profile.email,
                type: profile.user_type,
                location: profile.location
            }
        });
        
    } catch (error) {
        res.json({ success: false, error: error.message });
    }
});

// === JOB MANAGEMENT ===

app.get('/api/jobs', async (req, res) => {
    try {
        const { data: jobs, error: jobsError } = await supabase
            .from('jobs')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (jobsError) {
            return res.json({ success: false, error: jobsError.message });
        }
        
        const jobsWithFarmers = await Promise.all(
            jobs.map(async (job) => {
                const { data: farmer } = await supabase
                    .from('profiles')
                    .select('name, phone')
                    .eq('id', job.farmer_id)
                    .single();
                
                return {
                    id: job.id,
                    title: job.title,
                    description: job.description,
                    duration: job.duration,
                    payRate: job.pay_rate,
                    timeSlot: job.time_slot,
                    skillsRequired: job.skills_required,
                    location: job.location || 'Location not specified',
                    farmerName: farmer?.name || 'Unknown Farmer',
                    farmerPhone: farmer?.phone || '',
                    postedDate: job.created_at,
                    status: job.status || 'active'
                };
            })
        );
        
        res.json({ success: true, jobs: jobsWithFarmers });
        
    } catch (error) {
        res.json({ success: false, error: error.message });
    }
});

// CREATE JOB - Using raw insert values to avoid schema cache issues
app.post('/api/jobs', async (req, res) => {
    try {
        const { title, description, skillsRequired, timeSlot, duration, payRate } = req.body;
        const farmerId = req.headers['user-id'];
        
        console.log('Received job creation request:', { title, description, skillsRequired, timeSlot, duration, payRate, farmerId });
        
        if (!farmerId) {
            return res.json({ success: false, error: 'Must be logged in to post jobs' });
        }
        
        // Get farmer details first
        const { data: farmer, error: farmerError } = await supabase
            .from('profiles')
            .select('name, phone, location')
            .eq('id', farmerId)
            .single();
        
        if (farmerError) {
            console.log('Farmer error:', farmerError);
            return res.json({ success: false, error: 'Farmer profile not found: ' + farmerError.message });
        }
        
        console.log('Found farmer:', farmer);
        
        // Create job with explicit column mapping
        const jobData = {
            farmer_id: farmerId,
            title: title,
            description: description,
            duration: duration,
            pay_rate: parseInt(payRate),
            location: farmer.location || 'Location not specified',
            status: 'active'
        };
        
        // Add optional fields only if they exist
        if (skillsRequired) {
            jobData.skills_required = skillsRequired;
        }
        if (timeSlot) {
            jobData.time_slot = timeSlot;
        }
        
        console.log('Inserting job data:', jobData);
        
        const { data: job, error: jobError } = await supabase
            .from('jobs')
            .insert(jobData)
            .select()
            .single();
        
        if (jobError) {
            console.log('Job creation error:', jobError);
            return res.json({ success: false, error: jobError.message });
        }
        
        console.log('Job created successfully:', job);
        
        // Format response
        const formattedJob = {
            id: job.id,
            title: job.title,
            description: job.description,
            duration: job.duration,
            payRate: job.pay_rate,
            timeSlot: job.time_slot,
            skillsRequired: job.skills_required,
            location: job.location,
            farmerName: farmer.name,
            farmerPhone: farmer.phone,
            postedDate: job.created_at,
            status: job.status
        };
        
        res.json({ success: true, job: formattedJob });
        
    } catch (error) {
        console.log('Server error:', error);
        res.json({ success: false, error: error.message });
    }
});

app.post('/api/apply', async (req, res) => {
    try {
        const { jobId } = req.body;
        const workerId = req.headers['user-id'];
        
        if (!workerId) {
            return res.json({ success: false, error: 'Must be logged in to apply' });
        }
        
        // Check if already applied
        const { data: existingApp } = await supabase
            .from('job_applications')
            .select('id')
            .eq('job_id', jobId)
            .eq('worker_id', workerId)
            .single();
        
        if (existingApp) {
            return res.json({ success: false, error: 'Already applied for this job' });
        }
        
        const { data: application, error } = await supabase
            .from('job_applications')
            .insert({
                job_id: jobId,
                worker_id: workerId,
                status: 'pending'
            })
            .select()
            .single();
        
        if (error) {
            return res.json({ success: false, error: error.message });
        }
        
        res.json({ success: true, message: 'Application submitted successfully' });
        
    } catch (error) {
        res.json({ success: false, error: error.message });
    }
});

// === SERVE WEBSITE FILES ===
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

app.listen(PORT, () => {
    console.log(`✅ Server running on http://localhost:${PORT}`);
    console.log(' Connected to Supabase database');
   
});

module.exports = app;