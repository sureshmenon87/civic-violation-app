import passport from "passport";
import {
  Strategy as GoogleStrategy,
  Profile as GoogleProfile,
} from "passport-google-oauth20";
import { Strategy as GitHubStrategy } from "passport-github2";
import { UserModel } from "../models/User.js";
import { logger } from "../lib/logger.js";
console.log(
  "registered strategies",
  passport.strategies && Object.keys((passport as any)._strategies)
);
/**
 * We use passport strategies just to handle the OAuth flow and extract profile info.
 * The callback only returns the profile; actual token issuance is handled in route callback.
 */

// Google
const googleClientID = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
const googleCallback = process.env.GOOGLE_CALLBACK_URL;
// right before creating GoogleStrategy
logger.info("Using Google callback", { googleCallback }); // googleCallback should be 'http://localhost:4000/auth/google/callback'

if (googleClientID && googleClientSecret && googleCallback) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: googleClientID,
        clientSecret: googleClientSecret,
        callbackURL: `${process.env.BASE_URL}${googleCallback}`,
      },
      async (
        _accessToken: string,
        _refreshToken: string,
        profile: GoogleProfile,
        done
      ) => {
        try {
          const provider = "google";
          const providerId = profile.id;
          const email = profile.emails && profile.emails[0]?.value;
          const name = profile.displayName;
          const avatar = profile.photos && profile.photos[0]?.value;

          if (!email) {
            return done(new Error("Google account has no email"), null);
          }

          const update = {
            provider,
            providerId,
            email,
            name,
            avatar,
          };

          const user = await UserModel.findOneAndUpdate(
            { provider, providerId },
            { $set: update },
            { upsert: true, new: true, setDefaultsOnInsert: true }
          );

          done(null, user);
        } catch (err) {
          done(err as Error);
        }
      }
    )
  );
}

// GitHub
const githubClientID = process.env.GITHUB_CLIENT_ID;
const githubClientSecret = process.env.GITHUB_CLIENT_SECRET;
const githubCallback = process.env.GITHUB_CALLBACK_URL;

if (githubClientID && githubClientSecret && githubCallback) {
  passport.use(
    new GitHubStrategy(
      {
        clientID: githubClientID,
        clientSecret: githubClientSecret,
        callbackURL: githubCallback,
        scope: ["user:email"],
      },
      async (
        _accessToken: string,
        _refreshToken: string,
        profile: any,
        done
      ) => {
        try {
          const provider = "github";
          const providerId = String(profile.id);
          let email = profile.emails && profile.emails[0]?.value;
          if (!email) {
            // sometimes public email is missing; fallback to profile.username@github
            email = `${profile.username}@users.noreply.github.com`;
          }
          const name = profile.displayName || profile.username;
          const avatar = profile.photos && profile.photos[0]?.value;

          const update = { provider, providerId, email, name, avatar };

          const user = await UserModel.findOneAndUpdate(
            { provider, providerId },
            { $set: update },
            { upsert: true, new: true, setDefaultsOnInsert: true }
          );

          done(null, user);
        } catch (err) {
          done(err as Error);
        }
      }
    )
  );
}

passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

passport.deserializeUser((id, done) => {
  // Find user by ID in your database
  done(null, id);
});
