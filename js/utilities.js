function setViewportHeight() {
  // 1% of the viewport height
  const vh = window.innerHeight * 0.01;
  document.documentElement.style.setProperty('--svh', `${vh}px`);
}

/* Notification Modal Utility With Dialog Element */
function showNotificationModalDialog(title, message, okButtonText) {
    const notificationDialog = document.createElement("dialog");
    notificationDialog.className = "notification-modal-overlay-dialog";

    const notificationDialogCard = document.createElement("div");
    notificationDialogCard.className = "notification-modal-card-dialog";

    const notificationDialogCardHeader = document.createElement("div");
    notificationDialogCardHeader.className = "notification-modal-header-dialog";
    const notificationDialogCardHeaderTitle = document.createElement("h3");
    notificationDialogCardHeaderTitle.className = "notification-modal-title-dialog";
    notificationDialogCardHeaderTitle.textContent = title;
    notificationDialogCardHeader.appendChild(notificationDialogCardHeaderTitle);

    const notificationDialogCardBody = document.createElement("div");
    notificationDialogCardBody.className = "notification-modal-body-dialog";
    const notificationDialogCardBodyMessage = document.createElement("p");
    notificationDialogCardBodyMessage.className = "notification-modal-message-dialog";
    notificationDialogCardBodyMessage.innerHTML = message;
    notificationDialogCardBody.appendChild(notificationDialogCardBodyMessage);

    const notificationDialogCardFooter = document.createElement("div");
    notificationDialogCardFooter.className = "notification-modal-footer-dialog";
    const notificationDialogCardFooterOkButton = document.createElement("button");
    notificationDialogCardFooterOkButton.type = "button";
    notificationDialogCardFooterOkButton.classList.add("btn", "btn-outline-info", "notification-modal-ok-btn-dialog");
    notificationDialogCardFooterOkButton.textContent = okButtonText;
    notificationDialogCardFooter.appendChild(notificationDialogCardFooterOkButton);

    const cleanup = () => {
		notificationDialog.close();
		notificationDialogCardFooterOkButton.removeEventListener("click", onOk);
        body.removeChild(notificationDialog);
		console.log("Closed info modal");
	};

    const onOk = () => {
		cleanup();
	};

    notificationDialogCardFooterOkButton.addEventListener("click", onOk);

    notificationDialogCard.appendChild(notificationDialogCardHeader);
    notificationDialogCard.appendChild(notificationDialogCardBody);
    notificationDialogCard.appendChild(notificationDialogCardFooter);
    notificationDialog.appendChild(notificationDialogCard);
    body.appendChild(notificationDialog);

    notificationDialog.showModal();
}


/* Confirmation Modal Utility With Dialog Element */
function showConfirmModal(title, message, okButtonText) {
	return new Promise((resolve) => {
        const confirmationDialog = document.createElement("dialog");
        confirmationDialog.className = "confirm-modal-overlay-dialog";
        
        const confirmationDialogCard = document.createElement("div");
        confirmationDialogCard.className = "confirm-modal-card-dialog";
        const confirmationDialogCardHeader = document.createElement("div");
        confirmationDialogCardHeader.className = "confirm-modal-header-dialog";
        const confirmationDialogCardHeaderTitle = document.createElement("h3");
        confirmationDialogCardHeaderTitle.className = "confirm-modal-title-dialog";
        confirmationDialogCardHeaderTitle.textContent = title;
        confirmationDialogCardHeader.appendChild(confirmationDialogCardHeaderTitle);
        
        const confirmationDialogCardBody = document.createElement("div");
        confirmationDialogCardBody.className = "confirm-modal-body-dialog";
        const confirmationDialogCardBodyMessage = document.createElement("p");
        confirmationDialogCardBodyMessage.className = "confirm-modal-message-dialog";
        confirmationDialogCardBodyMessage.innerHTML = message;
        confirmationDialogCardBody.appendChild(confirmationDialogCardBodyMessage);
        
        const confirmationDialogCardFooter = document.createElement("div");
        confirmationDialogCardFooter.className = "confirm-modal-footer-dialog";
        const confirmationDialogCardFooterOkButton = document.createElement("button");
        confirmationDialogCardFooterOkButton.type = "button";
        confirmationDialogCardFooterOkButton.classList.add("btn", "btn-danger", "confirm-modal-ok-btn-dialog");
        confirmationDialogCardFooterOkButton.textContent = okButtonText;
        const confirmationDialogCardFooterCancelButton = document.createElement("button");
        confirmationDialogCardFooterCancelButton.type = "button";
        confirmationDialogCardFooterCancelButton.classList.add("btn", "btn-secondary", "confirm-modal-cancel-btn-dialog");
        confirmationDialogCardFooterCancelButton.textContent = "İptal";
        confirmationDialogCardFooter.appendChild(confirmationDialogCardFooterOkButton);
        confirmationDialogCardFooter.appendChild(confirmationDialogCardFooterCancelButton);
        
        const cleanup = () => {
            confirmationDialog.close();
            confirmationDialogCardFooterOkButton.removeEventListener("click", onOk);
            confirmationDialogCardFooterCancelButton.removeEventListener("click", onCancel);
            body.removeChild(confirmationDialog);
            console.log("Closed confirm modal");
        };
        
        const onOk = () => {
            cleanup();
            resolve(true);
        };
        
        const onCancel = () => {
            cleanup();
            resolve(false);
        };
        
        confirmationDialogCardFooterOkButton.addEventListener("click", onOk);
        confirmationDialogCardFooterCancelButton.addEventListener("click", onCancel);
        
        confirmationDialogCard.appendChild(confirmationDialogCardHeader);
        confirmationDialogCard.appendChild(confirmationDialogCardBody);
        confirmationDialogCard.appendChild(confirmationDialogCardFooter);
        confirmationDialog.appendChild(confirmationDialogCard);
        body.appendChild(confirmationDialog);
        
        confirmationDialog.showModal();
    });
}

function canPlayByMime(file) {
  const video = document.createElement('video');
  return video.canPlayType(file.type);
}

async function probeVideoMetadata(file) {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
	video.muted = true;

    const url = URL.createObjectURL(file);
    video.src = url;

    video.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve({
        duration: video.duration,
        width: video.videoWidth,
        height: video.videoHeight,
      });
    };

    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Metadata load failed'));
    };
  });
}

async function testPlayback(file, timeoutMs = 2800) {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;

    const url = URL.createObjectURL(file);
    video.src = url;

    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error("Playback timeout"));
    }, timeoutMs);

    function cleanup() {
      clearTimeout(timeout);
      URL.revokeObjectURL(url);
	  video.pause();
      video.remove();
    }

    video.oncanplay = async () => {
      try {
        await video.play();
        cleanup();
        resolve(true);
      } catch {
        cleanup();
        resolve(false);
      }
    };

    video.onerror = () => {
      cleanup();
       resolve(false);
    };
  });
}


async function validateVideoBeforeOPFS(file) {

	// Check size limits if needed
	const MAX_SIZE = 4096 * 1024 * 1024; // 4GB limit for OPFS
	if (file.size > MAX_SIZE) {
	return { supported: false, reason: 'Dosya çok büyük.' };
	}

	// Create video element test
	const video = document.createElement('video');
	const url = URL.createObjectURL(file);
	video.src = url;

	return new Promise((resolve) => {
		video.preload = 'metadata';

		video.onloadedmetadata = () => {
			URL.revokeObjectURL(url);
			resolve({
				supported: true,
				duration: video.duration,
				width: video.videoWidth,
				height: video.videoHeight,
				mimeType: file.type,
				size: file.size
			});
		};

		video.onerror = (e) => {
			URL.revokeObjectURL(url);
			console.error('Video error:', video.error);
			resolve({
				supported: false,
				reason: video.error?.message || 'Bilinmeyen video hatası',
				code: video.error?.code
			});
		};
	});
}

async function validatePosterImageBeforeOPFS(file) {
	if (!file.type.startsWith('image/')) {
		return { supported: false, reason: 'Dosya biçimi resim değil'};
	}
	const img = document.createElement('img');
	const url = URL.createObjectURL(file);
	img.src = url;

	return new Promise((resolve) => {
		img.onload = () => {
			URL.revokeObjectURL(url);
			if (img.naturalWidth > 0 && img.naturalHeight > 0) {
				resolve({ supported: true });
			} else {
				resolve({ supported: false, reason: 'Resim yüklenemedi, başka bir resim formatı deneyin' });
			}
		}

		img.onerror = () => {
			URL.revokeObjectURL(url);
			resolve({ supported: false, reason: 'Resim hatası, poster oluşturulamaz, başka bir resim formatı deneyin' });
		};
	});
}

function validatePosterGenerationBeforeOPFS(file) {
	if (!file.type.startsWith('video/')) {
		return { supported: false, reason: 'Dosya biçimi video değil'};
	}
	const video = document.createElement('video');
	const url = URL.createObjectURL(file);
	video.preload = 'metadata';
	video.src = url;

	return new Promise((resolve) => {
		video.onloadedmetadata = () => {
			URL.revokeObjectURL(url);
			if (video.videoWidth > 0 && video.videoHeight > 0) {
				resolve({ supported: true });
			} else {
				resolve({ supported: false, reason: 'Video meta verileri yüklenemedi, başka bir video formatı deneyin' });
			}
		}

		video.onerror = () => {
			URL.revokeObjectURL(url);
			resolve({ supported: false, reason: 'Video hatası, poster oluşturulamaz, başka bir video formatı deneyin' });
		};
	});
}

async function copyToOPFSWithCancel(directoryHandle, file, fileHandle, signal) {
  const writable = await fileHandle.createWritable();
  const reader = file.stream().getReader();
  let bytesWritten = 0;
  const totalBytes = file.size;
  let lastReport = 0;
  try {
    while (true) {
      if (signal.aborted) {
        throw new DOMException('Aborted', 'AbortError');
      }
      const { value, done } = await reader.read();
      if (done) break;
      await writable.write(value);
      bytesWritten += value.length;
      // Report progress every 100ms or on every 1 MiB written
      if (typeof file._onProgress === 'function' && (bytesWritten - lastReport > 1024 * 1024 || done)) {
        lastReport = bytesWritten;
        file._onProgress(bytesWritten, totalBytes);
      }
    }
    await writable.close();
  } catch (err) {
    await writable.abort();
    if (typeof fileHandle.remove === "function") {
      await fileHandle.remove().catch(() => {});
    } else {
      await directoryHandle.removeEntry(file.name);
    }
    throw err;
  }
}

function isUploading(videoId) {
  return activeUploadsGlobal.has(videoId);
}

function findInActiveUploadsGlobal(map, val) {
  for (let [k, v] of map) {
    if (v.storedFileName === val) { 
      return true; 
    }
  }  
  return false;
}

// Complete workflow with OPFS
async function handleVideoUpload(file) {
  const videoValidation = await validateVideoBeforeOPFS(file);
  const posterValidation = await validatePosterGenerationBeforeOPFS(file);
  
  if (!videoValidation.supported || !posterValidation.supported) {
    console.error(`Video not supported: ${videoValidation.reason || posterValidation.reason}`);
    return false;
  }
  
  // Proceed with OPFS storage
  try {
    const root = await navigator.storage.getDirectory();
    const fileHandle = await root.getFileHandle(file.name, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(file);
    await writable.close();
    
    console.log('Video saved to OPFS:', validation);
    return true;
  } catch (error) {
    console.error('OPFS save failed:', error);
    return false;
  }
}

// Simple implementation
async function shouldUploadVideo(file) {
  // Quick MIME type check
  if (!file.type.startsWith('video/')){
	return {supported: false, reason: 'Dosya biçimi video değil'};
  }
  
  // Test if browser can play it
  const video = document.createElement('video');
  const canPlay = video.canPlayType(file.type);
  
  if (canPlay === 'probably') return true;
  if (canPlay === 'maybe') {
    // Do more thorough check
    return await validateVideoBeforeOPFS(file);
  }
  return {supported: false, reason: 'Tarayıcı bu video formatını desteklemiyor'};
}

function isValidUrl(string) {
  try {
    new URL(string);
    return true;
  } catch (err) {
    return false;
  }
}

function validVideoFileType(file) {
	return videoFileTypes.includes(file.type);
}

function validImageFileType(file) {
	return imageFileTypes.includes(file.type);
}
function validFileType(file) {
	return videoFileTypes.includes(file.type) || imageFileTypes.includes(file.type);
}

function returnFileSize(number) {
	if (number < 1e3) {
		return `${number} bytes`;
	} else if (number >= 1e3 && number < 1e6) {
		return `${(number / 1e3).toFixed(1)} KB`;
	}
	return `${(number / 1e6).toFixed(1)} MB`;
}

function isMobileDevice() {
  const vendor = navigator.userAgent || navigator.vendor || window.opera;

  return !!(
    /(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino|android|ipad|playbook|silk/i.test(
      vendor
    ) ||
    /1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw-(n|u)|c55\/|capi|ccwa|cdm-|cell|chtm|cldc|cmd-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc-s|devi|dica|dmob|do(c|p)o|ds(12|-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(-|_)|g1 u|g560|gene|gf-5|g-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd-(m|p|t)|hei-|hi(pt|ta)|hp( i|ip)|hs-c|ht(c(-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i-(20|go|ma)|i230|iac( |-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|-[a-w])|libw|lynx|m1-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|-([1-8]|c))|phil|pire|pl(ay|uc)|pn-2|po(ck|rt|se)|prox|psio|pt-g|qa-a|qc(07|12|21|32|60|-[2-7]|i-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h-|oo|p-)|sdk\/|se(c(-|0|1)|47|mc|nd|ri)|sgh-|shar|sie(-|m)|sk-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h-|v-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl-|tdg-|tel(i|m)|tim-|t-mo|to(pl|sh)|ts(70|m-|m3|m5)|tx-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas-|your|zeto|zte-/i.test(
      vendor.substr(0, 4)
    )
  );
};

function pwaMode() {
  return window.matchMedia('(display-mode: standalone)').matches || window.matchMedia('(display-mode: fullscreen)').matches || window.matchMedia('(display-mode: minimal-ui)').matches || navigator.standalone === true;
}

const videoFileTypes = [
	"video/1d-interleaved-parityfec",
	"video/3gpp",
	"video/3gpp2",
	"video/3gpp-tt",
	"video/AV1",
	"video/BMPEG",
	"video/BT656",
	"video/CelB",
	"video/DV",
	"video/encaprtp",
	"video/evc",
	"video/example",
	"video/FFV1",
	"video/flexfec",
	"video/H261",
	"video/H263",
	"video/H263-1998",
	"video/H263-2000",
	"video/H264",
	"video/H264-RCDO",
	"video/H264-SVC",
	"video/H265",
	"video/H266",
	"video/hevc",
	"video/iso.segment",
	"video/JPEG",
	"video/jpeg2000",
	"video/jpeg2000-scl",
	"video/jxsv",
	"video/lottie+json",
	"video/matroska",
	'video/matroska; codecs="hev1.1.6.L93.B0"',
	'video/matroska; codecs="hvc1.1.6.L93.B0"',
	'video/matroska; codecs="hev1.2.4.L120.B0"',
	'video/matroska; codecs="hvc1.2.4.L120.B0"',
	"video/matroska-3d",
	"video/mj2",
	"video/MP1S",
	"video/MP2P",
	"video/MP2T",
	"video/mp4",
	'video/mp4; codecs="hev1.1.6.L93.B0"',
	'video/mp4; codecs="hvc1.1.6.L93.B0"',
	'video/mp4; codecs="hev1.2.4.L120.B0"',
	'video/mp4; codecs="hvc1.2.4.L120.B0"',
	"video/mkv",
	"video/mkv; codecs=hevc",
	"video/mkv; codecs=hvc1",
	'video/mkv; codecs="hev1.1.6.L93.B0"',
	'video/mkv; codecs="hvc1.1.6.L93.B0"',
	'video/mkv; codecs="hev1.2.4.L120.B0"',
	'video/mkv; codecs="hvc1.2.4.L120.B0"',
	"video/MP4V-ES",
	"video/MPV",
	"video/mpeg",
	"video/mpeg4-generic",
	"video/nv",
	"video/ogg",
	"video/parityfec",
	"video/pointer",
	"video/quicktime",
	"video/raptorfec",
	"video/raw",
	"video/rtp-enc-aescm128",
	"video/rtploopback",
	"video/rtx",
	"video/scip",
	"video/smpte291",
	"video/SMPTE292M",
	"video/ulpfec",
	"video/vc1",
	"video/vc2",
	"video/vnd.blockfact.factv",
	"video/vnd.CCTV",
	"video/vnd.dece.hd",
	"video/vnd.dece.mobile",
	"video/vnd.dece.mp4",
	"video/vnd.dece.pd",
	"video/vnd.dece.sd",
	"video/vnd.dece.video",
	"video/vnd.directv.mpeg",
	"video/vnd.directv.mpeg-tts",
	"video/vnd.dlna.mpeg-tts",
	"video/vnd.dvb.file",
	"video/vnd.fvt",
	"video/vnd.hns.video",
	"video/vnd.iptvforum.1dparityfec-1010",
	"video/vnd.iptvforum.1dparityfec-2005",
	"video/vnd.iptvforum.2dparityfec-1010",
	"video/vnd.iptvforum.2dparityfec-2005",
	"video/vnd.iptvforum.ttsavc",
	"video/vnd.iptvforum.ttsmpeg2",
	"video/vnd.motorola.video",
	"video/vnd.motorola.videop",
	"video/vnd.mpegurl",
	"video/vnd.ms-playready.media.pyv",
	"video/vnd.nokia.interleaved-multimedia",
	"video/vnd.nokia.mp4vr",
	"video/vnd.nokia.videovoip",
	"video/vnd.objectvideo",
	"video/vnd.planar",
	"video/vnd.radgamettools.bink",
	"video/vnd.radgamettools.smacker",
	"video/vnd.sealed.mpeg1",
	"video/vnd.sealed.mpeg4",
	"video/vnd.sealed.swf",
	"video/vnd.sealedmedia.softseal.mov",
	"video/vnd.uvvu.mp4",
	"video/vnd.youtube.yt",
	"video/vnd.vivo",
	"video/VP8",
	"video/VP9",
	"video/webm",
	"video/x-matroska",
];

const imageFileTypes = [
	"image/apng",
	"image/bmp",
	"image/gif",
	"image/jpeg",
	"image/pjpeg",
	"image/png",
	"image/svg+xml",
	"image/tiff",
	"image/webp",
	"image/x-icon",
];
