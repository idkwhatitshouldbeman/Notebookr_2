// Based on blueprint:javascript_auth_all_persistance
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const scryptAsync = promisify(scrypt);

// Helper to sanitize user objects - remove password before sending to frontend
function sanitizeUser(user: SelectUser) {
  const { password, ...sanitized } = user;
  return sanitized;
}

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

export function setupAuth(app: Express) {
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET!,
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      httpOnly: true,
      secure: true,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 1 week
    },
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy({ usernameField: "email" }, async (email, password, done) => {
      const user = await storage.getUserByEmail(email);
      if (!user || !(await comparePasswords(password, user.password))) {
        return done(null, false);
      } else {
        return done(null, user);
      }
    }),
  );

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: string, done) => {
    const user = await storage.getUser(id);
    done(null, user);
  });

  app.post("/api/register", async (req, res, next) => {
    console.log("[EXPRESS_AUTH] /api/register request received", {
      method: req.method,
      bodyKeys: Object.keys(req.body || {}),
      hasEmail: !!req.body?.email,
      hasPassword: !!req.body?.password,
      timestamp: new Date().toISOString(),
    });

    try {
      const existingUser = await storage.getUserByEmail(req.body.email);
      if (existingUser) {
        console.warn("[EXPRESS_AUTH] Registration failed - email already exists:", req.body.email);
        return res.status(400).send("Email already exists");
      }

      console.log("[EXPRESS_AUTH] Creating new user:", req.body.email);
      const user = await storage.createUser({
        ...req.body,
        password: await hashPassword(req.body.password),
      });

      console.log("[EXPRESS_AUTH] User created, logging in:", user.id);

      req.login(user, (err) => {
        if (err) {
          console.error("[EXPRESS_AUTH] Login error after registration:", err);
          return next(err);
        }
        console.log("[EXPRESS_AUTH] Registration successful:", user.id);
        res.status(201).json(sanitizeUser(user));
      });
    } catch (error: any) {
      console.error("[EXPRESS_AUTH] Registration error:", {
        message: error?.message,
        stack: error?.stack,
        error: error,
      });
      next(error);
    }
  });

  app.post("/api/login", (req, res, next) => {
    console.log("[EXPRESS_AUTH] /api/login request received", {
      method: req.method,
      bodyKeys: Object.keys(req.body || {}),
      hasEmail: !!req.body?.email,
      hasPassword: !!req.body?.password,
      timestamp: new Date().toISOString(),
    });

    passport.authenticate("local", (err: any, user: any, info: any) => {
      if (err) {
        console.error("[EXPRESS_AUTH] Login authentication error:", {
          message: err.message,
          stack: err.stack,
          error: err,
        });
        return next(err);
      }
      if (!user) {
        console.warn("[EXPRESS_AUTH] Login failed - invalid credentials", {
          info: info?.message || "Invalid credentials",
        });
        return res.status(401).json({ error: "Invalid credentials" });
      }

      req.logIn(user, (loginErr: any) => {
        if (loginErr) {
          console.error("[EXPRESS_AUTH] Login session error:", {
            message: loginErr.message,
            stack: loginErr.stack,
            error: loginErr,
          });
          return next(loginErr);
        }
        console.log("[EXPRESS_AUTH] Login successful:", user.id);
        res.status(200).json(sanitizeUser(req.user!));
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res, next) => {
    console.log("[EXPRESS_AUTH] /api/logout request received", {
      method: req.method,
      isAuthenticated: req.isAuthenticated(),
      timestamp: new Date().toISOString(),
    });

    req.logout((err) => {
      if (err) {
        console.error("[EXPRESS_AUTH] Logout error:", {
          message: err.message,
          stack: err.stack,
          error: err,
        });
        return next(err);
      }
      console.log("[EXPRESS_AUTH] Logout successful");
      res.sendStatus(200);
    });
  });

  app.get("/api/user", (req, res) => {
    console.log("[EXPRESS_AUTH] /api/user request received", {
      method: req.method,
      isAuthenticated: req.isAuthenticated(),
      hasUser: !!req.user,
      userId: req.user?.id,
      timestamp: new Date().toISOString(),
    });

    if (!req.isAuthenticated()) {
      console.log("[EXPRESS_AUTH] User not authenticated - returning null");
      return res.json(null);
    }
    console.log("[EXPRESS_AUTH] Returning user:", req.user!.id);
    res.json(sanitizeUser(req.user!));
  });
}

// Middleware to protect routes
export function isAuthenticated(req: any, res: any, next: any) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
}
