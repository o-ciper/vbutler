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