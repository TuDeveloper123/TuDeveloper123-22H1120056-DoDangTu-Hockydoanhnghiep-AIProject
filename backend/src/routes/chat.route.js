import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import { getStreamToken, getUnreadChannels } from "../controllers/chat.controller.js";

const router = express.Router();

router.get("/token", protectRoute, getStreamToken);

router.get("/unread-channels", protectRoute, getUnreadChannels);

export default router;
