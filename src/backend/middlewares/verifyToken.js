const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Verify Supabase access token
 * @param {string} accessToken - Supabase access token from client
 * @returns {Promise<User>} Supabase user object
 */
async function verifyToken(accessToken) {
    try {
        const { data: { user }, error } = await supabase.auth.getUser(accessToken);

        if (error || !user) {
            throw new Error('Invalid or expired token');
        }

        return user;
    } catch (error) {
        console.error('Token verification failed:', error);
        throw new Error('Invalid or expired token');
    }
}

module.exports = { verifyToken, supabase };