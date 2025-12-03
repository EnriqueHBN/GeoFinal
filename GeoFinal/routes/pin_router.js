const express = require("express");

const router = express.Router();
const pinteresService = require('../services/service_pines');
const service = new pinteresService();

router.get("/",async(req,res) => {
  try {
    const data = await service.getAll();
    res.json(data);
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
})


router.get("/:id",async (req,res) => {
  try {
    const {id} = req.params;
    const data = await service.getByID(id);
    res.json(data);
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
})


router.post("/",async(req,res)=> {
  try {
    const data = req.body;
    const newResource = await service.create(data);
    res.status(201).json({
        message: "Resource created successfull",
        data: newResource
      });
  } catch (e) {
    res.status(400).json({ message: e.message });
  }

});


router.patch("/:id",async(req,res)=> {
  try {
    const {id} = req.params;
    const changes = req.body;
    const data = await service.update(id,changes);
    res.status(200).json(data);
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
});


router.delete("/:id",async(req,res)=>{
  try {
    const {id} = req.params;
    const response = await service.delete(id);
    
    res.status(200).json({message: "Resource deleted successfull", data: response})
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
});

module.exports = router;
