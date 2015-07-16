/*******************************************************************************

INTEL CORPORATION PROPRIETARY INFORMATION
This software is supplied under the terms of a license agreement or nondisclosure
agreement with Intel Corporation and may not be copied or disclosed except in
accordance with the terms of that agreement
@licence Copyright(c) 2014-2015 Intel Corporation. All Rights Reserved.

*******************************************************************************/
var intel = intel || {};

// SDK namespaces
intel._namespace("intel.realsense");
intel._namespace("intel.realsense.face");
intel._namespace("intel.realsense.hand");
intel._namespace("intel.realsense.blob");
intel._namespace("intel.realsense.speech");

/**
    For web service versioning control
    1. Application may run with a previous version web service
    2. JavaScript interface, this file, selects a minimal major version of web service
    3. JavaScript interface determines the active version of web service based on availability
           activeVersion.major: default = releaseVersion.major but can be a lower major version
           activeVersion.majorMin: Minimal major version of web service, which this JS interface supports
*/
intel.realsense.releaseVersion = { major: 6, minor: 0 };
intel.realsense.activeVersion = { major: 6, majorMin: 5 };

/**
    Status codes that SDK interfaces return:
    negative values for errors; 0 for success; or positive values for warnings.
*/
intel.realsense.Status = {
    STATUS_NO_ERROR: 0,
    STATUS_FEATURE_UNSUPPORTED: -1,     /* Unsupported feature */
    STATUS_PARAM_UNSUPPORTED: -2,       /* Unsupported parameter(s) */
    STATUS_ITEM_UNAVAILABLE: -3,        /* Item not found/not available */
    STATUS_HANDLE_INVALID: -101,        /* Invalid session, algorithm instance, or pointer */
    STATUS_ALLOC_FAILED: -102,          /* Memory allocation failure */
    STATUS_DEVICE_FAILED: -201,         /* Acceleration device failed/lost */
    STATUS_DEVICE_LOST: -202,           /* Acceleration device lost */
    STATUS_DEVICE_BUSY: -203,           /* Acceleration device busy */
    STATUS_EXEC_ABORTED: -301,          /* Execution aborted due to errors in upstream components */
    STATUS_EXEC_INPROGRESS: -302,       /* Asynchronous operation is in execution */
    STATUS_EXEC_TIMEOUT: -303,          /* Operation time out */
    STATUS_FILE_WRITE_FAILED: -401,     /** Failure in open file in WRITE mode */
    STATUS_FILE_READ_FAILED: -402,      /** Failure in open file in READ mode */
    STATUS_FILE_CLOSE_FAILED: -403,     /** Failure in close a file handle */
    STATUS_DATA_UNAVAILABLE: -501,      /** Data not available for MW model or processing */
    STATUS_DATA_NOT_INITIALIZED: -502,	/** Data failed to initialize */
    STATUS_INIT_FAILED: -503,           /** Module failure during initialization */
    STATUS_STREAM_CONFIG_CHANGED: -601, /** Configuration for the stream has changed */
    STATUS_POWER_UID_ALREADY_REGISTERED: -701,
    STATUS_POWER_UID_NOT_REGISTERED: -702,
    STATUS_POWER_ILLEGAL_STATE: -703,
    STATUS_POWER_PROVIDER_NOT_EXISTS: -704,
    STATUS_CAPTURE_CONFIG_ALREADY_SET: -801,    /** parameter cannot be changed since configuration for capturing has been already set */
    STATUS_COORDINATE_SYSTEM_CONFLICT: -802,	/** Mismatched coordinate system between modules */
    STATUS_TIME_GAP: 101,                       /* time gap in time stamps */
    STATUS_PARAM_INPLACE: 102,                  /* the same parameters already defined */
    STATUS_DATA_NOT_CHANGED: 103,	            /* Data not changed (no new data available)*/
    STATUS_PROCESS_FAILED: 104                  /* Module failure during processing */
};

intel.realsense.Session = function (instance) {
    this.instance = instance;
    var self = this;
    var version = undefined;

    /** @brief Query the SDK version */
    intel.realsense.connection.call(instance, 'PXCMSession_QueryVersion').then(function (result) {
        self.version = result.version;
    });
};

/** 
    @brief Search a module implementation.
    @param[in]    templat         the template for the module search with optional fields
    @param[in]    1. group              of type intel.realsense.ImplGroup
    @param[in]    2: subgroup           of type intel.realsense.ImplSubgroup
    @param[in]    3: algorithm          integer
    @param[in]    4: merit              integer
    @param[in]    5: friendlyName       string
    @param[in] For instance, {'group':intel.realsense.ImplGroup.IMPL_GROUP_OBJECT_RECOGNITION, 
    @param[in]                'subgroup':intel.realsense.ImplSubgroup.IMPL_SUBGROUP_GESTURE_RECOGNITION}
    @param[out]   return an array list of module descriptors, accessable as result.impls
    @return Promise object with module descriptors
*/
intel.realsense.Session.prototype.queryImpls = function (templat) {
    return intel.realsense.connection.call(this.instance, 'PXCMSession_QueryImpls', templat);
};

/** 
    @brief Create an instance of the specified module.
    @param[in]    cuid              Interface identifier.
    @param[out]   instance          The created instance, to be returned.
    @return a Promise object
*/
intel.realsense.Session.prototype._createImpl = function (cuid) {
    self.cuid = cuid;
    return intel.realsense.connection.call(this.instance, 'PXCMSession_CreateImpl', { 'cuid': cuid }, 5000).then(function (result) {
        var object = null;
        if (self.cuid == intel.realsense.speech.SpeechRecognition._CUID) object = new intel.realsense.speech.SpeechRecognition(result.instance.value);
        return object;
    });
};

/** 
    @brief Return the module descriptor
    @param[in]  module          The module instance
    @return Promise object with module descriptor
*/
intel.realsense.Session.prototype.queryModuleDesc = function (module) {
    return intel.realsense.connection.call(this.instance, 'PXCMSession_QueryModuleDesc', { 'module': module.instance });
};
 
intel.realsense.ImplGroup = {  
    IMPL_GROUP_ANY: 0,                          /* Undefine group */
    IMPL_GROUP_OBJECT_RECOGNITION: 0x00000001,  /* Object recognition algorithms */
    IMPL_GROUP_SPEECH_RECOGNITION: 0x00000002,  /* Speech recognition algorithms */
    IMPL_GROUP_SENSOR: 0x00000004,              /* I/O modules */
};

intel.realsense.ImplSubgroup = {
    IMPL_SUBGROUP_ANY: 0,                           /* Undefined subgroup */
    IMPL_SUBGROUP_FACE_ANALYSIS: 0x00000001,        /* face analysis subgroup */
    IMPL_SUBGROUP_GESTURE_RECOGNITION: 0x00000010,  /* gesture recognition subgroup */
    IMPL_SUBGROUP_AUDIO_CAPTURE: 0x00000001,        /* audio capture subgroup */
    IMPL_SUBGROUP_VIDEO_CAPTURE: 0x00000002,        /* video capture subgroup */
    IMPL_SUBGROUP_SPEECH_RECOGNITION: 0x00000001,   /* speech recognition subgroup */
};

/**
    This is the main object for the Intel® RealSense™ SDK pipeline.
    Control the pipeline execution with this interface.
*/
intel.realsense.SenseManager = function (instance, session, captureManager) {
    var instance = instance;
    var self = this;
     
    /** public members which are available only
    *   after the return of SenseManager.createInstance() call. 
    */
    this.session = session;  
    this.captureManager = captureManager;
    
    /** private members */
    this._sessionStopped = true;   
    //  this._hbIntervalID = undefined;
    this._modules = {};

    /** OnConnect callback
        sender: device object 
        which callback is trigger, device information can be accessed with device.deviceInfo 
    */
    this.onConnect = function (sender, connected) { };

    /** sender: module */
    this.onStatus = function (sender, status) { };
   
    /** Initialize the SenseManager pipeline for streaming with callbacks. 
        The application must enable algorithm modules before calling this function.
        @return a Promise object
    */
    this.init = function () {
        intel.realsense.connection.subscribe_callback("PXCMSenseManager_OnConnect", this, this._onConnect);
        intel.realsense.connection.subscribe_callback("PXCMSenseManager_OnStatus", this, this._onStatus);
       
        var initPromise = intel.realsense.connection.call(instance, 'PXCMSenseManager_Init', { 'handler': true, 'onModuleProcessedFrame': true, 'onConnect': true, 'onStatus': true }, 5000).then(function () {
            return intel.realsense.connection.call(self.captureManager.instance, 'PXCMCaptureManager_QueryDevice').then(function (deviceResult) {    
                return intel.realsense.connection.call(deviceResult.instance.value, 'PXCMCapture_Device_QueryDeviceInfo').then(function (result) {
                    self.captureManager.device = new intel.realsense.Capture.Device(deviceResult.instance.value, result.dinfo);
                    return intel.realsense.connection.call(self.captureManager.instance, 'PXCMCaptureManager_QueryAggregatedImageSizes').then(function (result) {
                        self.captureManager._imageSizes = result.imageSizes;
                        return intel.realsense.connection.call(self.captureManager.instance, 'PXCMCaptureManager_QueryCapture').then(function (result) {
                            self.captureManager.capture = new intel.realsense.Capture(result.instance.value);
                        });
                    });
                });
            });
        }); 
        return initPromise;
    };

    /** Start streaming with reporting per-frame recognition results to callbacks specified in Enable* functions.
        The application must initialize the pipeline before calling this function.
        @return a Promise object
    */
    this.streamFrames = function () {
        self._sessionStopped = false;
        return intel.realsense.connection.call(instance, 'PXCMSenseManager_StreamFrames', { blocking: false });
    };

    /** Release the execution pipeline.
        @return a Promise object
    */
    this.release = function () {
        self._sessionStopped = true;
        this._stopHeartBeats();
        var releasePromise = intel.realsense.connection.call(instance, 'PXCMBase_Release', {}, 10000).then(function (result) {
            if (intel.realsense.connection !== 'undefined') {
                intel.realsense.connection.close();
                intel.realsense.connection = null;
            }
        });
        return releasePromise;
    };

    // Start to send HeartBeat messages to web service.
 
    this._sendHeartBeatMessage = function () {
        return intel.realsense.connection.call(instance, 'PXCM_HeartBeat', {});
    };

    this._startHeartBeats = function () {
        self._hbIntervalID = setInterval(this._sendHeartBeatMessage, 1000);
    };

    this._stopHeartBeats = function () {
        if (self._hbIntervalID != undefined) {
            clearInterval(self._hbIntervalID);
            self._hbIntervalID = undefined;
        }
    }; 
   

    this._onConnect = function (data) {
        var device = null;
        var connected = false;
        if (data.device != undefined && data.device.value != undefined) {
            device = new intel.realsense.Capture.Device(data.device.value, data.dinfo);
            connected = data.connected;
        }
        self.onConnect(device, connected);
    };

    this._onStatus = function (data) {
        var module;
        if (data.mid == 0)
            module = this;
        else
            module = self._modules[data.mid];
        self.onStatus(module, data.sts);
    };

    this._enableModule = function (mid) {
        var res;
        return intel.realsense.connection.call(instance, 'PXCMSenseManager_EnableModule', { mid: mid}).then(function (result) {
            return intel.realsense.connection.call(instance, 'PXCMSenseManager_QueryModule', { mid: mid });
        }).then(function (result2) {
            var module = null;
            if (mid == intel.realsense.face.FaceModule._CUID)
                module = new intel.realsense.face.FaceModule(result2.instance.value, self);
            else if (mid == intel.realsense.hand.HandModule._CUID)
                module = new intel.realsense.hand.HandModule(result2.instance.value, self);
            else if (mid == intel.realsense.blob.BlobModule._CUID)
                module = new intel.realsense.blob.BlobModule(result2.instance.value, self);
            else
                module = null;

            self._modules[mid] = module;
            return module;
        });
    };

    this._pauseModule = function (mid, pause) {
        return intel.realsense.connection.call(instance, 'PXCMSenseManager_PauseModule', { 'mid': mid, 'pause': pause });
    };

    this._onModuleProcessedFrame = function (response, self) {
        var module = self._modules[response.mid];
        if (module != undefined && module.onFrameProcessed != undefined) {
            var data = null;
            switch (response.mid) {
                case intel.realsense.face.FaceModule._CUID:
                    data = new intel.realsense.face.FaceData(response);
                    break;
                case intel.realsense.hand.HandModule._CUID:
                    data = new intel.realsense.hand.HandData(response);
                    break;
                case intel.realsense.blob.BlobModule._CUID:
                    data = new intel.realsense.blob.BlobData(response);
                    break;
            }
            module.onFrameProcessed(module, data);
        }
        return;
    };

    this.close = function () {
        return RealSense.connection.call(instance, 'PXCMSenseManager_Close', {}, 5000);
    };

    intel.realsense.connection.subscribe_callback("PXCMSenseManager_OnModuleProcessedFrame", this, this._onModuleProcessedFrame);
};

intel.realsense.SenseManager.createInstance = function () {
    if (intel.realsense.connection == null) intel.realsense.connection = new RealSenseConnection(intel.realsense.activeVersion.major);
    var jsVersion = intel.realsense.releaseVersion.major + '.' + intel.realsense.releaseVersion.minor;
    return intel.realsense.connection.call(0, 'PXCMSenseManager_CreateInstance', { 'js_version': jsVersion }).then(function (result) {
        var captureMgr = new intel.realsense.CaptureManager(result.captureManager_instance.value);
        var sess = new intel.realsense.Session(result.session_instance.value);
        var sense = new intel.realsense.SenseManager(result.instance.value, sess, captureMgr);
        sense._startHeartBeats();
        return sense;
    });
};



intel.realsense.CaptureManager = function (instance) {
    var self = this;
    this.instance = instance;
    this.device = undefined;
       
    /**
        @brief  _imageSizes stores stream resolutions of the specified stream type.
        @brief  _imageSizes is available only after return of SenseManager.init() call.
    */
    this._imageSizes = null;

    /**
        @brief   Return the stream resolution of the specified stream type.
        @param[in] type    The stream type
        @return a Promise object with property 'size' : { 'width' : Number, 'height' : Number }
    */
    this.queryImageSize = function (type) {
        if (self._imageSizes==null) return null;
        switch (type) {
            case intel.realsense.StreamType.STREAM_TYPE_COLOR:
                return self._imageSizes[0];
            case intel.realsense.StreamType.STREAM_TYPE_DEPTH:
                return self._imageSizes[1];
            case intel.realsense.StreamType.STREAM_TYPE_IR:
                return self._imageSizes[2];
            case intel.realsense.StreamType.STREAM_TYPE_LEFT:
                return self._imageSizes[3];
            case intel.realsense.StreamType.STREAM_TYPE_RIGHT:
                return self._imageSizes[4];
        }
        return null;
    };
};

intel.realsense.Capture = function (instance) {
    this.instance = instance;
    var self = this;
};

intel.realsense.Capture.Device = function (instance, deviceInfo) {
    this.instance = instance;
    var self = this;

    /**
        @brief  deviceInfo contains such device related information as device model.
        @brief  It is available either after return of SenseManager.init() call, or
        @brief  When OnConnect callback is triggered
    */
    this.deviceInfo = deviceInfo;
};

intel.realsense.Capture.Device.prototype.ResetProperties = function (streamType) {
    return intel.realsense.connection.call(this.instance, 'PXCMCapture_Device_ResetProperties', { 'streams': streamType });
};

intel.realsense.Capture.Device.prototype.restorePropertiesUponFocus = function (streamType) {
    return intel.realsense.connection.call(this.instance, 'PXCMCapture_Device_RestorePropertiesUponFocus');
};

intel.realsense.StreamType = {
    STREAM_TYPE_ANY: 0,            /* Unknown/undefined type */
    STREAM_TYPE_COLOR: 0x0001,     /* the color stream type  */
    STREAM_TYPE_DEPTH: 0x0002,     /* the depth stream type  */
    STREAM_TYPE_IR: 0x0004,        /* the infrared stream type */
    STREAM_TYPE_LEFT: 0x0008,      /* the stereoscopic left intensity image */
    STREAM_TYPE_RIGHT: 0x0010      /* the stereoscopic right intensity image */
};

intel.realsense.DeviceModel = {
    DEVICE_MODEL_GENERIC: 0x00000000, /* a generic device or unknown device */
    DEVICE_MODEL_F200: 0x0020000E,    /* the Intel(R) RealSense(TM) 3D Camera, model F200 */
    DEVICE_MODEL_R200: 0x0020000F     /* the Intel(R) RealSense(TM) DS4 Camera, model R200 */
};

intel.realsense.DeviceOrientation = {
    DEVICE_ORIENTATION_ANY: 0x0,            /* Unknown orientation */
    DEVICE_ORIENTATION_USER_FACING: 0x1,    /* A user facing camera */
    DEVICE_ORIENTATION_WORLD_FACING: 0x2    /* A world facing camera */
};
 

intel.realsense.face.FaceModule = function (instance, sense) {
    this.instance = instance;
    var self = this;
    var sm = sense;

    /** 
        Create a new instance of the face-module's active configuration.
        @return Configuration instance as a promise object
    */
    this.createActiveConfiguration = function () {
        var config_instance;
        return intel.realsense.connection.call(instance, 'PXCMFaceModule_CreateActiveConfiguration').then(function (result) {
            config_instance = result.instance.value;
            return intel.realsense.connection.call(result.instance.value, 'PXCMFaceConfiguration_GetConfigurations');
        }).then(function (result) {
            return new intel.realsense.face.FaceConfiguration(config_instance, result.configs);
        });
    };
};
intel.realsense.face.FaceModule._CUID = 1144209734;

intel.realsense.face.FaceModule.prototype.Pause = function (pause) {
    return sm._pauseModule(intel.realsense.face.FaceModule._CUID, pause);
};

/** default face data callback which can be overwritten by JS application */
intel.realsense.face.FaceModule.prototype.onFrameProcessed = function (module, data) {
};

intel.realsense.face.FaceModule.createInstance = function (sense) {
    return sense._enableModule(intel.realsense.face.FaceModule._CUID);
};

intel.realsense.face.FaceConfiguration = function (instance, configs) {
    this.instance = instance;
    var self = this;

    /* private member */
    this._configs = configs;

    /* public members */
    this.detection = configs.detection;     /* Detection configuration */
    this.landmarks = configs.landmarks;     /* Landmark configuration  */
    this.pose = configs.pose;               /* Pose configuration */
    this.expressions = configs.expressions;
    /**
        Expressions configuration within expressions.properties
        Two fields: 
                    isEnabled       (boolean)   
                    maxTrackedFaces (integer) 
    */

    /* Not necessary: based on 'isEnable' value - do at backend
    // @brief Enables all available face expressions. 
    this.expressions.enableAllExpressions = function () {
        if (self._configs.expressionInstance != null)
        return intel.realsense.connection.call(self._configs.expressionInstance, 'PXCMFaceConfiguration_ExpressionsConfiguration_EnableAllExpressions');
    }

    // @brief Disables all available face expressions. 
    this.expressions.disableAllExpressions = function () {
        if (self._configs.expressionInstance != null)
            return intel.realsense.connection.call(self._configs.expressionInstance, 'PXCMFaceConfiguration_ExpressionsConfiguration_DisableAllExpressions');
    }
    */

    /** Commit the configuration changes to the module
        This method must be called in order for any configuration changes to actually apply
        @return Promise object
    */
    this.applyChanges = function () {
        self._configs.detection = self.detection;
        self._configs.landmarks = self.landmarks;
        self._configs.pose = self.pose;
        self._configs.expressions = self.expressions;
        return intel.realsense.connection.call(self.instance, 'PXCMFaceConfiguration_ApplyChanges', { 'configs': self._configs});
    };

    this.release = function () {
        return intel.realsense.connection.call(self.instance, 'PXCMFaceConfiguration_Release');
    };
};

intel.realsense.face.TrackingStrategyType = {
    STRATEGY_APPEARANCE_TIME: 0,
    STRATEGY_CLOSEST_TO_FARTHEST: 1,
    STRATEGY_FARTHEST_TO_CLOSEST: 2,
    STRATEGY_LEFT_TO_RIGHT: 3,
    STRATEGY_RIGHT_TO_LEFT: 4
};

intel.realsense.face.SmoothingLevelType = {
    SMOOTHING_DISABLED: 0,
    SMOOTHING_MEDIUM: 1,
    SMOOTHING_HIGH: 2
};

intel.realsense.face.TrackingModeType = {
    FACE_MODE_COLOR: 0,
    FACE_MODE_COLOR_PLUS_DEPTH: 1,
    FACE_MODE_COLOR_STILL: 2
};

intel.realsense.face.FaceData = function (data) {
    var self = this;
    this.faces = data.faces;
    this.firedAlertData = data.alerts;
};

intel.realsense.face.LandmarkType = {
    LANDMARK_NOT_NAMED: 0,
    LANDMARK_EYE_RIGHT_CENTER: 1,
    LANDMARK_EYE_LEFT_CENTER: 2,
    LANDMARK_EYELID_RIGHT_TOP: 3,
    LANDMARK_EYELID_RIGHT_BOTTOM: 4,
    LANDMARK_EYELID_RIGHT_RIGHT: 5,
    LANDMARK_EYELID_RIGHT_LEFT: 6,
    LANDMARK_EYELID_LEFT_TOP: 7,
    LANDMARK_EYELID_LEFT_BOTTOM: 8,
    LANDMARK_EYELID_LEFT_RIGHT: 9,
    LANDMARK_EYELID_LEFT_LEFT: 10,
    LANDMARK_EYEBROW_RIGHT_CENTER: 11,
    LANDMARK_EYEBROW_RIGHT_RIGHT: 12,
    LANDMARK_EYEBROW_RIGHT_LEFT: 13,
    LANDMARK_EYEBROW_LEFT_CENTER: 14,
    LANDMARK_EYEBROW_LEFT_RIGHT: 15,
    LANDMARK_EYEBROW_LEFT_LEFT: 16,
    LANDMARK_NOSE_TIP: 17,
    LANDMARK_NOSE_TOP: 18,
    LANDMARK_NOSE_BOTTOM: 19,
    LANDMARK_NOSE_RIGHT: 20,
    LANDMARK_NOSE_LEFT: 21,
    LANDMARK_LIP_RIGHT: 22,
    LANDMARK_LIP_LEFT: 23,
    LANDMARK_UPPER_LIP_CENTER: 24,
    LANDMARK_UPPER_LIP_RIGHT: 25,
    LANDMARK_UPPER_LIP_LEFT: 26,
    LANDMARK_LOWER_LIP_CENTER: 27,
    LANDMARK_LOWER_LIP_RIGHT: 28,
    LANDMARK_LOWER_LIP_LEFT: 29,
    LANDMARK_FACE_BORDER_TOP_RIGHT: 30,
    LANDMARK_FACE_BORDER_TOP_LEFT: 31,
    LANDMARK_CHIN: 32
};

intel.realsense.face.LandmarksGroupType = {
    LANDMARK_GROUP_LEFT_EYE: 0x0001,
    LANDMARK_GROUP_RIGHT_EYE: 0x0002,
    LANDMARK_GROUP_RIGHT_EYEBROW: 0x0004,
    LANDMARK_GROUP_LEFT_EYEBROW: 0x0008,
    LANDMARK_GROUP_NOSE: 0x00010,
    LANDMARK_GROUP_MOUTH: 0x0020,
    LANDMARK_GROUP_JAW: 0x0040
};

intel.realsense.face.ExpressionsData = {};
intel.realsense.face.ExpressionsData.FaceExpression = {
    EXPRESSION_BROW_RAISER_LEFT: 0,
    EXPRESSION_BROW_RAISER_RIGHT: 1,
    EXPRESSION_BROW_LOWERER_LEFT: 2,
    EXPRESSION_BROW_LOWERER_RIGHT: 3,
    EXPRESSION_SMILE: 4,
    EXPRESSION_KISS: 5,
    EXPRESSION_MOUTH_OPEN: 6,
    EXPRESSION_EYES_CLOSED_LEFT: 7,
    EXPRESSION_EYES_CLOSED_RIGHT: 8,
    EXPRESSION_HEAD_TURN_LEFT: 9,
    EXPRESSION_HEAD_TURN_RIGHT: 10,
    EXPRESSION_HEAD_UP: 11,
    EXPRESSION_HEAD_DOWN: 12,
    EXPRESSION_HEAD_TILT_LEFT: 13,
    EXPRESSION_HEAD_TILT_RIGHT: 14,
    EXPRESSION_EYES_TURN_LEFT: 15,
    EXPRESSION_EYES_TURN_RIGHT: 16,
    EXPRESSION_EYES_UP: 17,
    EXPRESSION_EYES_DOWN: 18,
    EXPRESSION_TONGUE_OUT: 19,
	EXPRESSION_PUFF_RIGHT: 20,
    EXPRESSION_PUFF_LEFT: 21
};

intel.realsense.face.AlertType = {
    ALERT_NEW_FACE_DETECTED: 1,	        //  a new face enters the FOV and its position and bounding rectangle is available. 
    ALERT_FACE_OUT_OF_FOV: 2,			//  a new face is out of field of view (even slightly). 
    ALERT_FACE_BACK_TO_FOV: 3,			//  a tracked face is back fully to field of view. 
    ALERT_FACE_OCCLUDED: 4,			    //  face is occluded by any object or hand (even slightly).
    ALERT_FACE_NO_LONGER_OCCLUDED: 5,   //  face is not occluded by any object or hand.
    ALERT_FACE_LOST: 6					//  a face could not be detected for too long, will be ignored.
};

 
intel.realsense.hand.HandModule = function (instance, sense) {
    var instance = instance;
    var self = this;
    var sm = sense;

    /** 
        Create a new instance of the hand-module's active configuration.
        @return Configuration instance as a promise object
    */
    this.createActiveConfiguration = function () {
        return intel.realsense.connection.call(instance, 'PXCMHandModule_CreateActiveConfiguration').then(function (result) {
            return new intel.realsense.hand.HandConfiguration(result.instance.value);
        });
    };
};
intel.realsense.hand.HandModule._CUID = 1313751368;


intel.realsense.hand.HandModule.prototype.Pause = function (pause) {
    return sm._pauseModule(intel.realsense.face.HandModule._CUID, pause);
};

/** default hand data callback which can be overwritten by JS application */
intel.realsense.hand.HandModule.prototype.onFrameProcessed = function (module, data) {
};

intel.realsense.hand.HandModule.createInstance = function (sense) {
    return sense._enableModule(intel.realsense.hand.HandModule._CUID);
};

intel.realsense.hand.HandConfiguration = function (instance) {
    this.instance = instance;
    var self = this;

    /* public members */
    this.allGestures = false; 
    this.allAlerts = false;
      
    /** Commit the configuration changes to the module
        This method must be called in order for any configuration changes to actually apply
        @return Promise object
    */
    this.applyChanges = function () {
        return intel.realsense.connection.call(self.instance, 'PXCMHandConfiguration_ApplyChanges', { 'configs': { 'allGestures': self.allGestures, 'allAlerts': self.allAlerts }});
    };

    this.release = function () {
        return intel.realsense.connection.call(self.instance, 'PXCMHandConfiguration_Release');
    };
};


intel.realsense.hand.HandData = function (data) {
    var self = this;
    this._handsData = data;

    this.numberOfHands = 0;
    if (this._handsData.hands !== 'undefined')
        this.numberOfHands = this._handsData.hands.length;

    this.firedGestureData = data.gestures;
    this.firedAlertData = data.alerts;
};

intel.realsense.hand.HandData.prototype.queryHandIds = function (accessOrder) {
    if (this.numberOfHands <= 0) return null;

    var ids = [];
    var k;
    for (k = 0; k < this.numberOfHands; k++)
        ids[k] = this._handsData.hands[k].uniqueId;

    return ids;
};

intel.realsense.hand.HandData.prototype.queryHandData = function (accessOrder) {
    if (this.numberOfHands <= 0) return null;

    var arrHandData = [];
    var k;
    for (k = 0; k < this.numberOfHands; k++)
        arrHandData[k] = new intel.realsense.hand.HandData.IHand(this._handsData.hands[k]);

    return arrHandData;
};

intel.realsense.hand.HandData.prototype.queryHandDataById = function (handID) {
    var index = -1;
    for (i=0; i<this.numberOfHands; i++) {
        if (this._handsData.hands[index].uniqueId == handID){
            index = i; 
            break;
        }
    }
    if (index >= 0)
        return new intel.realsense.hand.HandData.IHand(this._handsData.hands[index]);
    else 
        return null;
};

intel.realsense.hand.NUMBER_OF_FINGERS = 5;
intel.realsense.hand.NUMBER_OF_EXTREMITIES = 6;
intel.realsense.hand.NUMBER_OF_JOINTS = 22;

intel.realsense.hand.JointType = {
    JOINT_WRIST: 0,		    /// The center of the wrist
    JOINT_CENTER: 1,		/// The center of the palm
    JOINT_THUMB_BASE: 2,	/// Thumb finger joint 1 (base)
    JOINT_THUMB_JT1: 3,		/// Thumb finger joint 2
    JOINT_THUMB_JT2: 4,		/// Thumb finger joint 3
    JOINT_THUMB_TIP: 5,		/// Thumb finger joint 4 (fingertip)
    JOINT_INDEX_BASE: 6,	/// Index finger joint 1 (base)
    JOINT_INDEX_JT1: 7,		/// Index finger joint 2
    JOINT_INDEX_JT2: 8,		/// Index finger joint 3
    JOINT_INDEX_TIP: 9,		/// Index finger joint 4 (fingertip)
    JOINT_MIDDLE_BASE: 10,	/// Middle finger joint 1 (base)
    JOINT_MIDDLE_JT1: 11,	/// Middle finger joint 2
    JOINT_MIDDLE_JT2: 12,	/// Middle finger joint 3
    JOINT_MIDDLE_TIP: 13,	/// Middle finger joint 4 (fingertip)
    JOINT_RING_BASE: 14,	/// Ring finger joint 1 (base)
    JOINT_RING_JT1: 15,		/// Ring finger joint 2
    JOINT_RING_JT2: 16,		/// Ring finger joint 3
    JOINT_RING_TIP: 17,		/// Ring finger joint 4 (fingertip)
    JOINT_PINKY_BASE: 18,	/// Pinky finger joint 1 (base)
    JOINT_PINKY_JT1: 19,	/// Pinky finger joint 2
    JOINT_PINKY_JT2: 20,	/// Pinky finger joint 3
    JOINT_PINKY_TIP: 21  	/// Pinky finger joint 4 (fingertip)	
};

intel.realsense.hand.ExtremityType = { 
    EXTREMITY_CLOSEST: 0,       /// The closest point to the camera in the tracked hand
    EXTREMITY_LEFTMOST: 1,	    /// The left-most point of the tracked hand
    EXTREMITY_RIGHTMOST: 2,	    /// The right-most point of the tracked hand 
    EXTREMITY_TOPMOST: 3,		/// The top-most point of the tracked hand
    EXTREMITY_BOTTOMMOST: 4,	/// The bottom-most point of the tracked hand
    EXTREMITY_CENTER: 5 		/// The center point of the tracked hand	
};

intel.realsense.hand.FingerType = {
    FINGER_THUMB: 0,          /// Thumb finger
    FINGER_INDEX: 1,          /// Index finger  
    FINGER_MIDDLE: 2,         /// Middle finger
    FINGER_RING: 3,           /// Ring finger
    FINGER_PINKY: 4           /// Pinky finger
};

intel.realsense.hand.BodySideType = {
    BODY_SIDE_UNKNOWN: 0,     /// The hand-type was not determined
    BODY_SIDE_LEFT: 1,        /// Left side of the body    
    BODY_SIDE_RIGHT: 2        /// Right side of the body
};

intel.realsense.hand.AlertType = { 
    ALERT_HAND_DETECTED: 0x0001,        ///  A hand is identified and its mask is available
    ALERT_HAND_NOT_DETECTED: 0x0002,    ///  A previously detected hand is lost, either because it left the field of view or because it is occluded
    ALERT_HAND_TRACKED: 0x0004,         ///  Full tracking information is available for a hand
    ALERT_HAND_NOT_TRACKED: 0x0008,     ///  No tracking information is available for a hand (none of the joints are tracked)
    ALERT_HAND_CALIBRATED: 0x0010,      ///  Hand measurements are ready and accurate 
    ALERT_HAND_NOT_CALIBRATED: 0x0020,  ///  Hand measurements are not yet finalized, and are not fully accurate
    ALERT_HAND_OUT_OF_BORDERS: 0x0040,  ///  Hand is outside of the tracking boundaries
    ALERT_HAND_INSIDE_BORDERS: 0x0080,  ///  Hand has moved back inside the tracking boundaries         
    ALERT_HAND_OUT_OF_LEFT_BORDER: 0x0100,   ///  The tracked object is touching the left border of the field of view
    ALERT_HAND_OUT_OF_RIGHT_BORDER: 0x0200,  ///  The tracked object is touching the right border of the field of view
    ALERT_HAND_OUT_OF_TOP_BORDER: 0x0400,    ///  The tracked object is touching the upper border of the field of view
    ALERT_HAND_OUT_OF_BOTTOM_BORDER: 0x0800, ///  The tracked object is touching the lower border of the field of view
    ALERT_HAND_TOO_FAR: 0x1000,         ///  The tracked object is too far
    ALERT_HAND_TOO_CLOSE: 0x2000        ///  The tracked object is too close
};

intel.realsense.hand.GestureStateType = {     
    GESTURE_STATE_START: 0,		    /// Gesture started
    GESTURE_STATE_IN_PROGRESS: 1,	/// Gesture is in progress
    GESTURE_STATE_END: 2			/// Gesture ended
};

intel.realsense.hand.TrackingModeType = {
    TRACKING_MODE_FULL_HAND: 0,	    /// Track the full skeleton
    TRACKING_MODE_EXTREMITIES: 1	///<Unsupported> Track the extremities of the hand
};

intel.realsense.hand.JointSpeedType = {
    JOINT_SPEED_AVERAGE: 0,         /// Average speed across time
    JOINT_SPEED_ABSOLUTE: 1 	    /// Average of absolute speed across time
};

intel.realsense.hand.AccessOrderType = {
    ACCESS_ORDER_BY_ID: 0,
    ACCESS_ORDER_BY_TIME: 1,        /// From oldest to newest hand in the scene           
    ACCESS_ORDER_NEAR_TO_FAR: 2,	/// From near to far hand in scene
    ACCESS_ORDER_LEFT_HANDS: 3,		/// All left hands
    ACCESS_ORDER_RIGHT_HANDS: 4,	/// All right hands
    ACCESS_ORDER_FIXED: 5			/// The index of each hand is fixed as long as it is detected (and between 0 and 1)
};


intel.realsense.hand.HandData.IHand = function (data) {
    var self = this;

    if (data !== undefined) {
        for (var key in data) {
            this[key] = data[key];
        }
    }
};

intel.realsense.blob.BlobModule = function (instance, sense) {
    this.instance = instance;
    var self = this;
    var sm = sense;

    /**
        Create a new instance of the blob module's active configuration.
        @return Configuration instance as a promise object
    */
    this.createActiveConfiguration = function () {
        return intel.realsense.connection.call(instance, 'PXCMBlobModule_CreateActiveConfiguration', {}, 2000).then(function (result) {
            return new intel.realsense.blob.BlobConfiguration(result.instance.value, result.configs);
        });
    };
};
intel.realsense.blob.BlobModule._CUID = 1145916738;

intel.realsense.blob.BlobModule.prototype.Pause = function (pause) {
    return sm._pauseModule(intel.realsense.blob.BlobModule._CUID, pause);
};

/** default blob data callback which can be overwritten by JS application */
intel.realsense.blob.BlobModule.prototype.onFrameProcessed = function (module, data) {
};

intel.realsense.blob.BlobModule.createInstance = function (sense) {
    return sense._enableModule(intel.realsense.blob.BlobModule._CUID);
};

intel.realsense.blob.BlobConfiguration = function (instance, configs) {
    this.instance = instance;
    var self = this;

    /* private members */
    this._configs = configs;

    /* public members */
    this.maxBlobs = configs.maxBlobs;               // maximal number of blobs that can be detected.
    this.maxDistance = configs.maxDistance;         // maximal distance in meters of a detected blob from the sensor.
    this.maxObjectDepth = configs.maxObjectDepth;   // maximal depth in millimeters of a blob.
    this.minPixelCount = configs.minPixelCount;     // minimal blob size in pixels.
    this.enableFlag = configs.enableFlag;           // flag to enable/disable extraction of the segmentation image.
    this.minContourSize = configs.minContourSize;   // minimal contour size in points.
    this.maxPixelCount = configs.maxPixelCount;     // maximal blob size in pixels.
    this.maxBlobArea = configs.maxBlobArea;         // maximal blob area in meter.
    this.minBlobArea= configs.minBlobArea;          // minimal blob area in meter.
    this.blobSmoothing = configs.blobSmoothing;     // segmentation smoothing

    /** Commit the configuration changes to the module
        This method must be called in order for any configuration changes to actually apply
        @return Promise object
    */
    this.applyChanges = function () {
        self._configs.maxBlobs = self.maxBlobs;
        self._configs.maxDistance = self.maxDistance;
        self._configs.maxObjectDepth = self.maxObjectDepth;
        self._configs.minPixelCount = self.minPixelCount;
        self._configs.enableFlag = self.enableFlag;
        self._configs.minContourSize = self.minContourSize;
        self._configs.maxPixelCount = self.maxPixelCount;
        self._configs.maxBlobArea = self.maxBlobArea;
        self._configs.minBlobArea = self.minBlobArea;
        self._configs.blobSmoothing = self.blobSmoothing;
        return intel.realsense.connection.call(self.instance, 'PXCMBlobConfiguration_ApplyChanges', { 'configs': self._configs });
    };

    this.release = function () {
        return intel.realsense.connection.call(self.instance, 'PXCMBlobConfiguration_Release');
    };
};
intel.realsense.blob.MAX_NUMBER_OF_BLOBS = 4;

intel.realsense.blob.BlobData = function (data) {
    var self = this;
    this._blobsData = data;

    this.numberOfBlobs = 0;
    if (this._blobsData.blobs_depth !== 'undefined')
        this.numberOfBlobs = this._blobsData.blobs_depth.length;

};

intel.realsense.blob.BlobData.prototype.queryBlob = function (index, segmentationImageType, accessOrderType) {
    if (segmentationImageType == intel.realsense.blob.SegmentationImageType.SEGMENTATION_IMAGE_COLOR)
        return null;  // no support of color segmentation type in JS yet
    
    if (index >= this.numberOfBlobs)
        return null;

    var mappedIndex = this._blobsData.mappings_depth[accessOrderType].mapping[index];
    return new intel.realsense.blob.BlobData.IBlob(this._blobsData, this._blobsData.blobs_depth[mappedIndex]);
}
    

intel.realsense.blob.AccessOrderType = {
    ACCESS_ORDER_NEAR_TO_FAR: 0,	 /// From near to far hand in scene
    ACCESS_ORDER_LARGE_TO_SMALL: 1,  /// From largest to smallest blob in the scene   		
    ACCESS_ORDER_RIGHT_TO_LEFT: 2    /// From rightmost to leftmost blob in the scene  
};

intel.realsense.blob.ExtremityType = {
    EXTREMITY_CLOSEST: 0,       /// The closest point to the camera in the tracked blob
    EXTREMITY_LEFTMOST: 1,	    /// The left-most point of the tracked blob
    EXTREMITY_RIGHTMOST: 2,	    /// The right-most point of the tracked blob 
    EXTREMITY_TOPMOST: 3,		/// The top-most point of the tracked blob
    EXTREMITY_BOTTOMMOST: 4,	/// The bottom-most point of the tracked blob
    EXTREMITY_CENTER: 5		    /// The center point of the tracked blob			
};

intel.realsense.blob.SegmentationImageType =
{
    SEGMENTATION_IMAGE_DEPTH: 0,
    SEGMENTATION_IMAGE_COLOR: 1
};

intel.realsense.blob.BlobData.IBlob = function (blobsData, data) {
    var self = this;
    var _blobsData = blobsData;
    var _blobData = data;

    this.numberOfContours = 0;
    if (_blobData !== 'undefined' && _blobData.contours != 'undefined')
        this.numberOfContours = _blobData.contours.length;

    if (data !== undefined) {
        for (var key in data) {
            this[key] = data[key];
        }
    }
};


intel.realsense.speech.SpeechRecognition = function (instance) {
    this.instance = instance;
    var self = this;
    var _profiles = null;
    var _profiles_promise = null;

    // default callbacks - to be overwritten by JS app
    var onRecognition = function (data) { };
    var onAlert = function (data) { };
};

/**
    @brief  The function returns the working algorithm configuration.
    @return configuration with a Promise object
*/
intel.realsense.speech.SpeechRecognition.prototype.queryProfile = function () {
    return intel.realsense.connection.call(this.instance, 'PXCMSpeechRecognition_QueryProfile', { 'idx': -1 }).then(function (result) {
        return result.pinfo;
    });
};

/**
    @brief  The function returns all available algorithm configurations.
    @return configuration with a Promise object
*/
intel.realsense.speech.SpeechRecognition.prototype.queryProfiles = function () {
    if (self._profiles == null) {
        self._profiles_promise = intel.realsense.connection.call(this.instance, 'PXCMSpeechRecognition_QuerySupportedProfiles').then(function (result) {
            self._profiles = result.profiles;
            return self._profiles;
        });
        return self._profiles_promise;
    } else {
        var myresolve;
        var promise = new Promise(function (resolve, reject) {
            myresolve = resolve;
        });
        myresolve(self._profiles);
        return promise;
    }
};

/**
    @brief The function sets the working algorithm configurations. 
    @param[in] pinfo       The algorithm configuration.
    @return Promise object
*/
intel.realsense.speech.SpeechRecognition.prototype.setProfile = function (pinfo) {
    return intel.realsense.connection.call(this.instance, 'PXCMSpeechRecognition_SetProfile', { 'pinfo': pinfo });
};

/** 
    @brief The function builds the recognition grammar from the list of strings. 
    @param[in] gid          The grammar identifier. Can be any non-zero number.
    @param[in] cmds         The string list.
    @param[in] labels       Optional list of labels. If not provided, the labels are 1...ncmds.
    @return Promise object
*/
intel.realsense.speech.SpeechRecognition.prototype.buildGrammarFromStringList = function (gid, cmds, labels) {
    if (gid == 0) {
        return new Promise(function (resolve, reject) {
            reject({ 'status': STATUS_FEATURE_NOT_SUPPORT });
        });
    }
    return intel.realsense.connection.call(this.instance, 'PXCMSpeechRecognition_BuildGrammarFromStringList', { 'gid': gid, 'cmds': cmds, 'labels': labels });
};

/** 
    @brief The function deletes the specified grammar and releases any resources allocated.
    @param[in] gid          The grammar identifier.
    @return Promise object
*/
intel.realsense.speech.SpeechRecognition.prototype.releaseGrammar = function (gid) {
    if (gid == 0) {
        return new Promise(function (resolve, reject) {
            reject({ 'status': STATUS_FEATURE_NOT_SUPPORT });
        });
    }
    return intel.realsense.connection.call(this.instance, 'PXCMSpeechRecognition_ReleaseGrammar', { 'gid': gid });
};

/** 
    @brief The function sets the active grammar for recognition.
    @param[in] gid          The grammar identifier.
    @return Promise object
*/
intel.realsense.speech.SpeechRecognition.prototype.setGrammar = function (gid) {
    if (gid == 0) {
        return new Promise(function (resolve, reject) {
            reject({ 'status': STATUS_FEATURE_NOT_SUPPORT });
        });
    }
    return intel.realsense.connection.call(this.instance, 'PXCMSpeechRecognition_SetGrammar', { 'gid': gid }, 30000);
    // Loading language model may take long time
};

/** 
    @brief The function starts voice recognition.
    @return Promise object

*/
intel.realsense.speech.SpeechRecognition.prototype.startRec = function () {
    if (self.onRecognition !== 'undefined' && self.onRecognition != null) {
        intel.realsense.connection.subscribe_callback("PXCMSpeechRecognition_OnRecognition", this, self.onRecognition);
    }

    if (self.onAlert !== 'undefined' && self.onAlert != null) {
        intel.realsense.connection.subscribe_callback("PXCMSpeechRecognition_OnAlert", this, self.onAlert);
    }

    // Loading language model may take several seconds: thus set 20 seconds as timeout
    return intel.realsense.connection.call(instance, 'PXCMSpeechRecognition_StartRec', { 'handler': true, 'onRecognition': true, 'onAlert': true }, 20000);    
};

/** 
    @brief The function stops voice recognition immediately.
    @return Promise object
*/
intel.realsense.speech.SpeechRecognition.prototype.stopRec = function () {
    return intel.realsense.connection.call(this.instance, 'PXCMSpeechRecognition_StopRec', {});
};

intel.realsense.speech.SpeechRecognition._CUID = -2146187993;

intel.realsense.speech.SpeechRecognition.createInstance = function (sense) {
    return sense.session._createImpl(intel.realsense.speech.SpeechRecognition._CUID);
};

intel.realsense.speech.AlertType = {
    ALERT_VOLUME_HIGH: 0x00001,             /** The volume is too high. */
    ALERT_VOLUME_LOW: 0x00002,              /** The volume is too low. */
    ALERT_SNR_LOW: 0x00004,                 /** Too much noise. */
    ALERT_SPEECH_UNRECOGNIZABLE: 0x00008,   /** There is some speech available but not recognizable. */
    ALERT_SPEECH_BEGIN: 0x00010,            /** The begining of a speech. */
    ALERT_SPEECH_END: 0x00020,              /** The end of a speech. */
    ALERT_RECOGNITION_ABORTED: 0x00040,     /** The recognition is aborted due to device lost, engine error, etc. */
    ALERT_RECOGNITION_END: 0x00080          /** The recognition is completed. The audio source no longer provides data. */
};

intel.realsense.speech.LanguageType = {
    LANGUAGE_US_ENGLISH: 0x53556e65,       /** US English */
    LANGUAGE_GB_ENGLISH: 0x42476e65,       /** British English */
    LANGUAGE_DE_GERMAN: 0x45446564,        /** German */
    LANGUAGE_US_SPANISH: 0x53557365,       /** US Spanish */
    LANGUAGE_LA_SPANISH: 0x414c7365,       /** Latin American Spanish */
    LANGUAGE_FR_FRENCH: 0x52467266,        /** French */
    LANGUAGE_IT_ITALIAN: 0x54497469,       /** Italian */
    LANGUAGE_JP_JAPANESE: 0x504a616a,      /** Japanese */
    LANGUAGE_CN_CHINESE: 0x4e43687a,       /** Simplified Chinese */
    LANGUAGE_BR_PORTUGUESE: 0x52427470     /** Portuguese */
};



intel.realsense.SenseManager.detectPlatform = function (components, cameras) {
    var myresolve;
    var info = new Object();
    info.isCameraReady = false;
    info.isDCMUpdateNeeded = false;
    info.isRuntimeInstalled = false;
    info.isCheckNeeded = false;
    /* nextStep: 'driver', 'runtime', 'unsupported', 'ready' */
    info.nextStep = 'ready';

    var promise = new Promise(function (resolve, reject) {
        myresolve = resolve;
    });

    // Check if it is Windows platform
    if ((navigator.appVersion.indexOf("Win") == -1) || (navigator.appVersion.indexOf("WOW64") == -1) || !("WebSocket" in window)) {
        info.nextStep = 'unsupported';
        myresolve(info);
    }

    // Get RealSenseInfo from Capability.Servicer.RealSense
    getRealSenseInfo = function (callback) {
        if (intel.realsense.connection == null) intel.realsense.connection = new RealSenseConnection(intel.realsense.activeVersion.major);
        intel.realsense.connection.onerror = function (err) {
            var info = new Object();
            info.isCameraReady = false;
            info.isDCMUpdateNeeded = false;
            info.isRuntimeInstalled = false;
            info.isCheckNeeded = true;
            info.nextStep = 'runtime';
            callback(info);
            return;
        };
        return intel.realsense.connection.call(0, 'PXCM_GetRealSenseInfo', { 'js_version': 'v' + intel.realsense.activeVersion.major });
    };

    compareVersion = function (left, right) {
        if (typeof left != 'string') return 0;
        if (typeof right != 'string') return 0;
        var l = left.split('.');
        var r = right.split('.');
        var length = Math.min(l.length, r.length);

        for (i = 0; i < length; i++) {
            if ((l[i] && !r[i] && parseInt(l[i]) > 0) || (parseInt(l[i]) > parseInt(r[i]))) {
                return 1;
            } else if ((r[i] && !l[i] && parseInt(r[i]) > 0) || (parseInt(l[i]) < parseInt(r[i]))) {
                return -1;
            }
        }
        return 0;
    };

    var onerror = function () {
        info.isCheckNeeded = true;
        info.nextStep = 'runtime';
        myresolve(info);
        return;
    };

    var xhr;
    var onReady = function () {
        try {
            if (xhr.readyState == 4) {
                if (xhr.response != undefined) {
                    // Decide active web service version
                    for (ver = intel.realsense.releaseVersion.major; ver >= intel.realsense.activeVersion.majorMin; ver--) {
                        var version = 'v' + ver;
                        if (xhr.response.includes('realsense/rssdk_v' + ver)) {
                            intel.realsense.activeVersion.major = ver;
                            break;
                        }
                    }
                }

                // Retrieve component list
                getRealSenseInfo(myresolve).then(function (result) {
                    if (intel.realsense.connection !== 'undefined') {
                        intel.realsense.connection.close();
                        intel.realsense.connection = null;
                    }
                    
                    var info = result;
                    info.isCameraReady = false;
                    info.isDCMUpdateNeeded = false;
                    info.isRuntimeInstalled = false;
                    info.isCheckNeeded = false;
                    info.nextStep = 'ready';
                 
                    var cameraInfo = [];  
                    if ('dcmservice_sr300' in info) {
                        cameraInfo['front'] = (compareVersion(info.ivcam, '1.2') < 0);
                        cameraInfo['f250'] = cameraInfo['front'];
                    } else if ('ivcam' in info) {
                        cameraInfo['front'] = (compareVersion(info.ivcam, '1.2') < 0);
                        cameraInfo['f200'] = cameraInfo['front'];
                    }

                    // Future enhancement: || ('dcmservice_r400' in info)
                    if ('dcmservice_r200' in info) {
                        cameraInfo['rear'] = (compareVersion(info.dcmservice_r200, '2.0') < 0);
                        cameraInfo['r200'] = cameraInfo['rear'];
                    }

                    if (cameras.length == 0) {
                        info.nextStep = 'unsupported';

                        if ('front' in cameraInfo && info.nextStep != 'ready') {
                            info.isCameraReady = true;
                            info.isDCMUpdateNeeded = cameraInfo['front'];
                            if (info.isDCMUpdateNeeded)
                                info.nextStep = 'driver';
                            else
                                info.nextStep = 'ready';
                        }

                        if ('rear' in cameraInfo && info.nextStep != 'ready') {
                            info.isCameraReady = true;
                            info.isDCMUpdateNeeded = cameraInfo['rear'];
                            if (info.isDCMUpdateNeeded)
                                info.nextStep = 'driver';
                            else
                                info.nextStep = 'ready';
                        }                           
                    } else {
                        info.nextStep = 'unsupported';
                        for (i = 0; i < cameras.length; i++) {
                            if (cameras[i] in cameraInfo) {
                                info.isCameraReady = true;
                                info.isDCMUpdateNeeded = cameraInfo[cameras[i]];
                                if (!info.isDCMUpdateNeeded) {
                                    info.nextStep = 'ready';
                                    break;
                                }
                            }
                        }
                    }

                    if (info.nextStep == 'ready') {
                        info.isRuntimeInstalled = true;
                        var activeVersion = intel.realsense.activeVersion.major + '.0';
                        if (!("web_server" in info) || compareVersion(activeVersion, info.web_server) > 0) {
                            info.isRuntimeInstalled = false;
                            info.nextStep = 'runtime';
                        }  else if (components != null) {
                            for (i = 0; i < components.length; i++) {
                                if (!(components[i] in info)) {
                                    info.isRuntimeInstalled = false;
                                    info.nextStep = 'runtime';
                                }
                            }
                        }
                    }

                    myresolve(info);
                }).catch(onerror);
            }
        } catch (err) {
            onerror();
        }
        };

    try {
        /* TODO: Check with Pranav if we need to use CORS on IE/Firefox. */
        xhr = new XMLHttpRequest();
        xhr.open("GET", "https://192.55.233.1/capabilityproxy/capabilities", true);
        xhr.onload = onReady;
        xhr.timeout = 5000;
        xhr.ontimeout = onerror;
        xhr.onerror = onerror;
        xhr.send();
    } catch (err) {
        myresolve(info);
    }
    return promise;
};
