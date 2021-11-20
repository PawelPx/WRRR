const webcamElement = document.getElementById('webcam');
const canvasElement = document.getElementById('canvas');
const imageElement = document.getElementById('faces');
const webcam = new Webcam(webcamElement, 'user');
let selectedMask = $(".selected-mask img");
let model = null;
let cameraFrame = null;
let detectFace = false;
let clearMask = false;
let masks = [];
let maskKeyPointIndexs = [10, 234, 152, 454]; //overhead, left Cheek, chin, right cheek


$('.md-modal').addClass('md-show');
webcam.start()
    .then(result =>{
        cameraStarted();
        console.log("webcam started");
        startFaceMask();
    })
    .catch(err => {
        displayError();
    });


$("#arrowLeft").click(function () {
    let itemWidth = parseInt($("#mask-list ul li").css("width")) 
                    + parseInt($("#mask-list ul li").css("margin-left")) 
                    + parseInt($("#mask-list ul li").css("margin-right"));
    let marginLeft = parseInt($("#mask-list ul").css("margin-left"));
    $("#mask-list ul").css({"margin-left": (marginLeft+itemWidth) +"px", "transition": "0.3s"});
});

$("#arrowRight").click(function () {
    let itemWidth = parseInt($("#mask-list ul li").css("width")) 
    + parseInt($("#mask-list ul li").css("margin-left")) 
    + parseInt($("#mask-list ul li").css("margin-right"));
    let marginLeft = parseInt($("#mask-list ul").css("margin-left"));
    $("#mask-list ul").css({"margin-left": (marginLeft-itemWidth) +"px", "transition": "0.3s"});
});

$("#mask-list ul li").click(function () {
    $(".selected-mask").removeClass("selected-mask");
    $(this).addClass("selected-mask");
    selectedMask = $(".selected-mask img");
    clearCanvas();
});

$('#closeError').click(function() {
    $("#webcam-switch").prop('checked', false).change();
});

async function startFaceMask() {
    return new Promise((resolve, reject) => {
        $(".loading").removeClass('d-none');
        faceLandmarksDetection.load(faceLandmarksDetection.SupportedPackages.mediapipeFacemesh).then(mdl => { 
            model = mdl;
            $(".loading").addClass('d-none');
            console.log("model loaded");
            if(webcam.facingMode == 'user'){
                detectFace = true;
            }
            
            cameraFrame =  detectFaces();
            resolve();
        })
        .catch(err => {
            displayError('Fail to load face mesh model<br/>Please refresh the page to try again');
            reject(error);
        });
    });
}

async function detectFaces() {
    await model.estimateFaces
        ({
            input: webcamElement,
            returnTensors: false,
            flipHorizontal: true,
            predictIrises: false
        }).then(predictions => {
        //console.log(predictions);
        drawMask(predictions);
        if(clearMask){
            clearCanvas();
            clearMask = false;
        }
        if(detectFace){
            cameraFrame = requestAnimFrame(detectFaces);
        }
    });
}

function drawMask(predictions){
    if(masks.length != predictions.length){
        clearCanvas();
    }
    overheadIndex = 0;
    chinIndex = 2;
    leftCheekIndex = 3;
    rightCheekIndex = 1;
    if (predictions.length > 0) {
        for (let x = 0; x < predictions.length; x++) {
            const keypoints = predictions[x].scaledMesh;  //468 key points of face;
           
            if(masks.length > x){
                dots = masks[x].keypoints;
                maskElement = masks[x].maskElement;
            }
            else{
                dots = [];
                maskElement = $("<img src='"+selectedMask.attr('src')+"' id='mask_"+x+"' class='mask' />");
                masks.push({
                    keypoints: dots,
                    maskElement: maskElement
                });
                maskElement.appendTo($("#canvas"));
            }
            for (let i = 0; i < maskKeyPointIndexs.length; i++) {
                const coordinate = getCoordinate(keypoints[maskKeyPointIndexs[i]][0], keypoints[maskKeyPointIndexs[i]][1]);
                if(dots.length > i){
                    dot = dots[i];
                }
                else{
                    dotElement = $("<div class='dot'></div>");
                    //dotElement.appendTo($("#canvas"));
                    dot = {top:0, left:0, element: dotElement};
                    dots.push(dot);
                }
                dot.left = coordinate[0];
                dot.top = coordinate[1];
                dot.element.css({top:dot.top, left:dot.left, position:'absolute'});
            }
            maskType = selectedMask.attr("data-mask-type");
            switch(maskType) {
                case 'full':
                    maskCoordinate= {top: dots[overheadIndex].top, left: dots[leftCheekIndex].left};
                    maskHeight = Math.sqrt((dots[chinIndex].left - dots[overheadIndex].left)**2 + (dots[chinIndex].top - dots[overheadIndex].top)**2) ;
                    break;
                case 'half':
                default:
                    maskCoordinate = dots[leftCheekIndex];
                    maskHeight = Math.sqrt((dots[chinIndex].left - dots[leftCheekIndex].left)**2 + (dots[chinIndex].top - dots[leftCheekIndex].top)**2) ;
                    break;
            }
            maskWidth = Math.sqrt((dots[rightCheekIndex].left - dots[leftCheekIndex].left)**2 + (dots[rightCheekIndex].top - dots[leftCheekIndex].top)**2);
            maskSizeAdjustmentWidth = parseFloat(selectedMask.attr("data-scale-width"));
            maskSizeAdjustmentHeight = parseFloat(selectedMask.attr("data-scale-height"));
            maskSizeAdjustmentTop = parseFloat(selectedMask.attr("data-top-adj"));
            maskSizeAdjustmentLeft = parseFloat(selectedMask.attr("data-left-adj"));
            
            //angleA = (dots[overheadIndex].left - dots[chinIndex].left) / (dots[rightCheekIndex].left - dots[leftCheekIndex].left)
            //angleB = (dots[leftCheekIndex].left - dots[rightCheekIndex].left) / (dots[overheadIndex].left - dots[chinIndex].left)
            //maskAngle = (angleA <= 1 ? angleA : (2 + angleB)) * 45;
            x0 = (dots[rightCheekIndex].left + dots[leftCheekIndex].left) / 2;
            y0 = (dots[overheadIndex].top + dots[chinIndex].top) / 2;
            dx = x0-dots[overheadIndex].left;
            dy = dots[overheadIndex].top-y0;
            maskAngle = -(Math.atan2(dy, dx) * (180/Math.PI) + 90);

            maskTop = maskCoordinate.top - ((maskHeight * (maskSizeAdjustmentHeight-1))/2) - (maskHeight * maskSizeAdjustmentTop);
            maskLeft = maskCoordinate.left - ((maskWidth * (maskSizeAdjustmentWidth-1))/2) + (maskWidth * maskSizeAdjustmentLeft);
            
            maskElement.css('transform','rotate(' + maskAngle + 'deg)');
            maskElement.css({
                top: maskTop, 
                left: maskLeft, 
                width: maskWidth * maskSizeAdjustmentWidth,
                height: maskHeight * maskSizeAdjustmentHeight,
                position:'absolute'
            });
        }
    }
}

function getCoordinate(x,y){
    if(webcam.webcamList.length ==1 || window.innerWidth/window.innerHeight >= webcamElement.width/webcamElement.height){
        ratio = canvasElement.clientHeight/webcamElement.height;
        resizeX = x*ratio;
        resizeY = y*ratio;
    }
    else if(window.innerWidth>=1024){
        ratio = 2;
        leftAdjustment = ((webcamElement.width/webcamElement.height) * canvasElement.clientHeight - window.innerWidth) * 0.38
        resizeX = x*ratio - leftAdjustment;
        resizeY = y*ratio;
    }
    else{
        leftAdjustment = ((webcamElement.width/webcamElement.height) * canvasElement.clientHeight - window.innerWidth) * 0.35
        resizeX = x - leftAdjustment;
        resizeY = y;
    }

    return [resizeX, resizeY];
}

function clearCanvas(){
    $("#canvas").empty();
    masks = [];
}

$(window).resize(function() {
    resizeCanvas();
});