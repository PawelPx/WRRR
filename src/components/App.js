const { ipcRenderer }  = require('electron')

import React, { useState, useEffect, useRef } from 'react'
import Webcam from "react-webcam";
import * as tf from "@tensorflow/tfjs";
// OLD MODEL
// import * as facemesh from "@tensorflow-models/facemesh";

// NEW MODEL
import * as facemesh from "@tensorflow-models/face-landmarks-detection";
import { drawMesh } from "./utilities";

import '../assets/css/App.css'

import mask0 from '../assets/faces/full-mask-1.png'
import mask1 from '../assets/faces/full-mask-2.png'
import mask2 from '../assets/faces/full-mask-3.png'
import mask3 from '../assets/faces/full-mask-4.png'

const videoConstraints = {
  width: 1280,
  height: 720,
  facingMode: "user"
};
const App = () => {

  const webcamRef = useRef(null);
  const canvasRef = useRef(null);

  // const [bottom, setBottom] = useState(0);
  // const [left, setLeft] = useState(0);

  const [cord, setCord] = useState([]);

  const [counter, setCounter] = useState(0);

  const runFacemesh = async () => {
    const net = await facemesh.load(facemesh.SupportedPackages.mediapipeFacemesh);
    setInterval(() => {
      detect(net);
    }, 50);
  };

  const detect = async (net) => {
    if (
      typeof webcamRef.current !== "undefined" &&
      webcamRef.current !== null &&
      webcamRef.current.video.readyState === 4
    ) {
      // Get Video Properties
      const video = webcamRef.current.video;
      const videoWidth = webcamRef.current.video.videoWidth;
      const videoHeight = webcamRef.current.video.videoHeight;

      // Set video width
      webcamRef.current.video.width = videoWidth;
      webcamRef.current.video.height = videoHeight;

      // Set canvas width
      canvasRef.current.width = videoWidth;
      canvasRef.current.height = videoHeight;

      // Make Detections
      const face = await net.estimateFaces({input:video});

      // Get canvas context
      const ctx = canvasRef.current.getContext("2d");

      // console.log(face[0].scaledMesh)

      let keypoints = face[0].scaledMesh

      let minx = 1000; ///////
      let maxx = 0;
      let miny = 1000;
      let maxy = 0; //////

      for(let i=0; i<keypoints.length; i++) {
        if(keypoints[i][0] > maxx) {
          maxx = keypoints[i][0]
        }
        if(keypoints[i][0] < minx) {
          minx = keypoints[i][0]
        }
        if(keypoints[i][1] > maxy) {
          maxy = keypoints[i][1]
        }
        if(keypoints[i][1] < miny) {
          miny = keypoints[i][1]
        }
      }
      setCord([minx, maxx, miny, maxy])

      // console.log(minx, maxx, miny, maxy)


      // requestAnimationFrame(()=>{drawMesh(face, ctx)});
    }
  };

  useEffect(()=>{runFacemesh()}, []);

  const handleClickPlus = (e) => {
    e.preventDefault();

    setCounter(c => (c+1)%4)
  }
  const handleClickMinus = (e) => {
    e.preventDefault();

    if(counter - 1 < 0) {
      setCounter(3)
    } else{
      setCounter(c => (c-1)%4)
    }
  }

  const getMask = () => {
    const tab = [mask0,mask1,mask2,mask3]
    return tab[counter]
  }

  return (
    <div>
      <h1>Hello, Electron!</h1>

      <p>I hope you enjoy using basic-electron-react-boilerplate to start your dev off right! {counter}</p>
      <button onClick={handleClickPlus}>plus</button>
      <button onClick={handleClickMinus}>minus</button>

      <>
        <Webcam
          ref={webcamRef}
          style={{
            position: "absolute",
            marginLeft: "auto",
            marginRight: "auto",
            left: 0,
            right: 0,
            textAlign: "center",
            zindex: 9,
            width: 640,
            height: 480,
          }}
        />
        <canvas ref={canvasRef}
          style={{
            position: "absolute",
            marginLeft: "auto",
            marginRight: "auto",
            left: 0,
            right: 0,
            textAlign: "center",
            zindex: 9,
            width: 640,
            height: 480,
          }}></canvas>
          <img src={getMask()} style={{
            position: "absolute",
            left: 130+cord[0] - (cord[1]-cord[0])*0.28 ,
            top: 90+cord[2] - (cord[3]-cord[2])*0.22 ,
            right: 0,
            textAlign: "center",
            zindex: 9,
            width: (cord[1]-cord[0])*1.5,
            height: (cord[3]-cord[2])*1.5,
          }}></img>

      </>
    </div>
  )
}

export default App
