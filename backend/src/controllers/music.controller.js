const musicModel = require ("../models/music.model");
const albumModel = require("../models/album.model")
const {uploadFile} = require("../services/storage.service")
const jwt = require("jsonwebtoken");

async function getMusic(req, res){
  const musics = await musicModel.find()
    .populate("artist", "username")
    .sort({ _id: -1 });

  res.status(200).json({
    musics: musics.map((music) => ({
      id: music._id,
      title: music.title,
      uri: music.uri,
      artist: music.artist?.username || "Unknown artist",
    })),
  });
}

async function createMusic(req, res){
  

    const {title} =  req.body;
    const file = req.file;

    const result = await uploadFile(file.buffer.toString('base64'))
  const music = await musicModel.create({
    uri: result.url,
    title,
    artist:req.user.id,
  })
  res.status(201).json({
    message:"Music created Successfully",
    music:{
        id: music._id,
        uri: music.uri,
        title: music.title,
        artist: music.artist,
    }
  })

}

async function createAlbum(req, res){
    const token = req.cookies.token;

            const {title, musics} = req.body;
            const album = await albumModel.create({
                title,
                artist: req.user.id,
                musics: musics,
            })
            res.status(201).json({
                message:"Album created successfully",
                album:{
                    id: album._id,
                    title:album.title,
                    artist: album.artist,
                    musics: album.musics,
                }
            })
  
}


module.exports = {getMusic, createMusic, createAlbum}
