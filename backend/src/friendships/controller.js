import friendshipService from "./service.js";
import {
  publicUserParamsSchema,
  sendRequestParamsSchema,
  removeFriendParamsSchema,
  respondRequestParamsSchema,
  respondRequestBodySchema,
} from "./schemas.js";

function getStatusCode(error) {
  return Number(error?.status) || 400;
}

const sendRequest = async (req, res) => {
  try {
    const { username } = sendRequestParamsSchema.parse(req.params);
    const friendship = await friendshipService.sendRequest(req.auth.id, username);
    res.status(201).json({ friendship });
  } catch (error) {
    res.status(getStatusCode(error)).json({ error: error.message });
  }
};

const listIncoming = async (req, res) => {
  try {
    const requests = await friendshipService.listIncoming(req.auth.id);
    res.json({ requests });
  } catch (error) {
    res.status(getStatusCode(error)).json({ error: error.message });
  }
};

const listOutgoing = async (req, res) => {
  try {
    const requests = await friendshipService.listOutgoing(req.auth.id);
    res.json({ requests });
  } catch (error) {
    res.status(getStatusCode(error)).json({ error: error.message });
  }
};

const respondRequest = async (req, res) => {
  try {
    const { id } = respondRequestParamsSchema.parse(req.params);
    const { action } = respondRequestBodySchema.parse(req.body);
    const friendship = await friendshipService.respondRequest(req.auth.id, id, action);
    res.json({ friendship });
  } catch (error) {
    res.status(getStatusCode(error)).json({ error: error.message });
  }
};

const listFriends = async (req, res) => {
  try {
    const friends = await friendshipService.listFriends(req.auth.id);
    res.json({ friends });
  } catch (error) {
    res.status(getStatusCode(error)).json({ error: error.message });
  }
};

const removeFriendship = async (req, res) => {
  try {
    const { userId } = removeFriendParamsSchema.parse(req.params);
    await friendshipService.removeFriendship(req.auth.id, userId);
    res.status(204).send();
  } catch (error) {
    res.status(getStatusCode(error)).json({ error: error.message });
  }
};

const getPublicUser = async (req, res) => {
  try {
    const { username } = publicUserParamsSchema.parse(req.params);
    const user = await friendshipService.getPublicUserByUsername(username);
    res.json({ user });
  } catch (error) {
    res.status(getStatusCode(error)).json({ error: error.message });
  }
};

export default {
  sendRequest,
  listIncoming,
  listOutgoing,
  respondRequest,
  listFriends,
  removeFriendship,
  getPublicUser,
};
