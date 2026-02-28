const passport    = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User        = require('../models/User');
const { generateAccessToken, generateRefreshToken } = require('../utils/generateToken');

passport.use(
  new GoogleStrategy(
    {
      clientID:     process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL:  `${process.env.SERVER_URL || 'http://localhost:5000'}/api/auth/google/callback`,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value;
        if (!email) return done(new Error('No email from Google'), null);

        // Find existing user or create one
        let user = await User.findOne({ email });

        if (!user) {
          // Auto-register via Google — role defaults to 'tenant', user can change in profile
          user = await User.create({
            name:         profile.displayName,
            email,
            password:     Math.random().toString(36).slice(-16) + 'Aa1!', // Random secure password they'll never use
            role:         'tenant',
            phoneNumber:  '0000000000', // Placeholder — user must update
            isVerified:   true,         // Email verified via Google
            profilePhoto: profile.photos?.[0]?.value || null,
          });
        } else {
          // Update profile photo from Google if not set
          if (!user.profilePhoto && profile.photos?.[0]?.value) {
            user.profilePhoto = profile.photos[0].value;
          }
          user.isVerified = true;
          user.lastLogin  = new Date();
          await user.save();
        }

        return done(null, user);
      } catch (err) {
        return done(err, null);
      }
    }
  )
);

passport.serializeUser((user, done)   => done(null, user._id));
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id).select('-password');
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

module.exports = passport;
