import { Router } from "express";
import { requireAuth } from "../auth/middleware.js";
import friendshipController from "./controller.js";

const router = Router();

router.use(requireAuth);

router.post("/friends/requests/:username", friendshipController.sendRequest);
router.get("/friends/requests/incoming", friendshipController.listIncoming);
router.get("/friends/requests/outgoing", friendshipController.listOutgoing);
router.patch("/friends/requests/:id", friendshipController.respondRequest);
router.get("/friends", friendshipController.listFriends);
router.delete("/friends/:userId", friendshipController.removeFriendship);
router.get("/friends/users/:username", friendshipController.getPublicUser);

export default router;
