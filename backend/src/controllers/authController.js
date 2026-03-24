const authController = {
    register(req, res){
    res.json({message: "Register"})
    },
    login(req, res){
        res.json({message: "Login"})
    }
}

export default authController;