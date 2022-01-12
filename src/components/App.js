const { ipcRenderer } = require("electron");

import React, { useState, useEffect, useRef } from "react";
import Webcam from "react-webcam";
import * as tf from "@tensorflow/tfjs";
// OLD MODEL
// import * as facemesh from "@tensorflow-models/facemesh";

// NEW MODEL
import * as facemesh from "@tensorflow-models/face-landmarks-detection";
import { drawMesh } from "./utilities";

import "../assets/css/App.css";

import mask0 from "../assets/faces/full-mask-1.png";
import mask01 from "../assets/faces/full-mask-1-left.png";
import mask02 from "../assets/faces/full-mask-1-right.png";
import mask1 from "../assets/faces/full-mask-2.png";
import mask2 from "../assets/faces/full-mask-3.png";
import mask3 from "../assets/faces/full-mask-4.png";
import halfmask0 from "../assets/faces/half-mask-1.png";
import halfmask1 from "../assets/faces/half-mask-2.png";
import halfmask2 from "../assets/faces/half-mask-3.png";
import halfmask3 from "../assets/faces/half-mask-4.png";

import Slider from "react-slick";

const videoConstraints = {
  width: 1280,
  height: 720,
  facingMode: "user",
};

const App = () => {
  const webcamRef = useRef(null);
  const canvasRef = useRef(null);

  // const [bottom, setBottom] = useState(0);
  // const [left, setLeft] = useState(0);
  const [cord, setCord] = useState([]);
  const [counter, setCounter] = useState(0);
  const [maskAngle, setMaskAngle] = useState(0);
  const [maskHeight, setMaskHeight] = useState(0);
  const [maskWidth, setMaskWidth] = useState(0);
  const [maskWidth1, setMaskWidth1] = useState(0);
  const [maskWidth2, setMaskWidth2] = useState(0);
  const [location, setLocation] = useState([]);

  const images = [
    {
      id: "fullMask1",
      index: 0,
      url: mask0,
    },
    {
      id: "fullMask2",
      index: 1,
      url: mask1,
    },
    {
      id: "fullMask3",
      index: 2,
      url: mask2,
    },
    {
      id: "fullMask4",
      index: 3,
      url: mask3,
    },
    {
      id: "halfMask1",
      index: 4,
      url: halfmask0,
    },
    {
      id: "halfMask2",
      index: 5,
      url: halfmask1,
    },
    {
      id: "halfMask3",
      index: 6,
      url: halfmask2,
    },
    {
      id: "halfMask4",
      index: 7,
      url: halfmask3,
    },
  ];

  const runFacemesh = async () => {
    const net = await facemesh.load(
      facemesh.SupportedPackages.mediapipeFacemesh
    );
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
      video.style.cssText =
        "-moz-transform: scale(-1, 1); \
      -webkit-transform: scale(-1, 1); -o-transform: scale(-1, 1); \
      transform: scale(-1, 1); filter: FlipH;";

      // Set video width
      webcamRef.current.video.width = videoWidth;
      webcamRef.current.video.height = videoHeight;

      // Set canvas width
      canvasRef.current.width = videoWidth;
      canvasRef.current.height = videoHeight;

      // Make Detections
      const face = await net.estimateFaces({ input: video });

      // Get canvas context
      const ctx = canvasRef.current.getContext("2d");

      // console.log(face[0].scaledMesh)

      let keypoints = face[0].scaledMesh;

      let minx = 1000; ///////
      let maxx = 0;
      let miny = 1000;
      let maxy = 0; //////

      for (let i = 0; i < keypoints.length; i++) {
        if (keypoints[i][0] > maxx) {
          maxx = keypoints[i][0];
        }
        if (keypoints[i][0] < minx) {
          minx = keypoints[i][0];
        }
        if (keypoints[i][1] > maxy) {
          maxy = keypoints[i][1];
        }
        if (keypoints[i][1] < miny) {
          miny = keypoints[i][1];
        }
      }
      setCord([minx, maxx, miny, maxy]);

      // console.log(minx, maxx, miny, maxy)
      let overhead = keypoints[10];
      let leftCheek = keypoints[234];
      let chin = keypoints[152];
      let rightCheek = keypoints[454];
      let nose = keypoints[1];

      const height = Math.sqrt(
        (chin[0] - overhead[0]) ** 2 + (chin[1] - overhead[1]) ** 2
      );
      const width = Math.sqrt(
        (leftCheek[0] - rightCheek[0]) ** 2 +
          (leftCheek[0] - rightCheek[0]) ** 2
      );
      const width1 = Math.sqrt(
        (rightCheek[0] - nose[0]) ** 2 +
          (rightCheek[0] - nose[0]) ** 2
      );
      const width2 = Math.sqrt(
        (nose[0] - leftCheek[0]) ** 2 +
          (nose[0] - leftCheek[0]) ** 2
      );
      const x0 = (rightCheek[0] + leftCheek[0]) / 2;
      const y0 = (overhead[1] + chin[1]) / 2;
      const dx = x0 - overhead[0];
      const dy = overhead[1] - y0;
      const angle = Math.atan2(dy, dx) * (180 / Math.PI) + 90;
      setMaskAngle(angle);
      setMaskHeight(height);
      setMaskWidth(width);
      setMaskWidth1(width1);
      setMaskWidth2(width2);
      setLocation([rightCheek[0], overhead[1]]);

      // requestAnimationFrame(()=>{drawMesh(face, ctx)});
    }
  };

  useEffect(() => {
    runFacemesh();
  }, []);

  const getMask = () => {
    return images[counter].url;
  };

  const sliderSettings = {
    infinite: true,
    speed: 500,
    slidesToShow: 3,
    slidesToScroll: 1,
    swipeToSlide: true,
    focusOnSelect: true,
    className: "slider",
  };

  const onMaskClick = (index) => {
    setCounter(index);
  };

  return (
    <div>
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
        <canvas
          ref={canvasRef}
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
        ></canvas>

        <img
          src={mask01}
          style={{
            position: "absolute",
            left: counter > 3 ? 635 - location[0] : 620 - location[0],
            top: counter > 3 ? location[1] + 60 : location[1] - 30,
            right: 0,
            textAlign: "center",
            zindex: 9,
            width: counter > 3 ? maskWidth1 * 0.9 : maskWidth1,
            height: counter > 3 ? maskHeight * 0.7 : maskHeight * 1.5,
            transform: `rotate(${maskAngle}deg)`,
          }}
        ></img>
        <img
          src={mask02}
          style={{
            position: "absolute",
            left: counter > 3 ? 635 - location[0] : 620 - location[0] + Math.cos(Math.PI / 180 * Math.abs(maskAngle)) * (counter > 3 ? maskWidth1 * 0.9 : maskWidth1),
            top: counter > 3 ? location[1] + 60 : location[1] - 30 + (maskAngle > 0 ? 1 : -1) * (Math.sin(Math.PI / 180 * Math.abs(maskAngle)) * (counter > 3 ? maskWidth1 * 0.9 : maskWidth1)),
            right: 0,
            textAlign: "center",
            zindex: 9,
            width: counter > 3 ? maskWidth2 * 0.9 : maskWidth2,
            height: counter > 3 ? maskHeight * 0.7 : maskHeight * 1.5,
            transform: `rotate(${maskAngle}deg)`,
          }}
        ></img>
      </>

      <Slider {...sliderSettings}>
        {images.map((image) => {
          return (
            <div className="wrapper" key={image.id}>
              <button
                className="maskButton"
                onClick={() => onMaskClick(image.index)}
              >
                <img className="sliderImg" src={image.url} />
              </button>
            </div>
          );
        })}
      </Slider>
    </div>
  );
};

export default App;
