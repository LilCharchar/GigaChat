import { registerSchema, loginSchema } from "./schemas.js";
import authService from "./service.js";

const register = async (req, res) => {
  try {
    const data = registerSchema.parse(req.body);
    const user = await authService.register(data);
    res.status(201).json(user);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const login = async (req, res) => {
  try {
    const data = loginSchema.parse(req.body);
    const result = await authService.login(data);
    res.json(result);
  } catch (error) {
    res.status(401).json({ error: error.message });
  }
};

export default { register, login };
