//const videoPlayers = document.getElementById("video-players");
// const player = document.getElementById("player");
// const pb = document.getElementById("pb");

const html = document.documentElement;

const showTheButton = document.getElementById("show-the-button");
const settingsBtn = document.getElementById("settings-button");
const settingsPanelContainer = document.getElementById("settings-panel-container");
const profileSettingsBtn = document.getElementById("profile-settings-panel-tab-btn");
const closeSettingsBtns = document.querySelectorAll(".close-settings-btn");
const videoSettingsBtn = document.getElementById("video-settings-panel-tab-btn");
const closeBtns = document.querySelectorAll(".close-btn");
const videoCountSelector = document.getElementById("video-count-selector");
// const videoListGrid = document.querySelector(".video-list-grid");
const videoListGrid = document.getElementById("video-players");
const videoSettingsPanel = document.getElementById("video-settings-panel");
const profileSettingsPanel = document.getElementById("profile-settings-panel");	
const profileSelect = document.getElementById("profile-select");
const profileListContainer = document.getElementById("profile-list-container");
const addProfileBtn = document.getElementById("add-profile-btn");
const addProfileSection = document.querySelector(".add-profile-section");
const profileNameInput = document.getElementById("profile-name-input");
const removeProfileBtn = document.getElementById("remove-profile-btn");
const removeAllProfilesBtn = document.getElementById("remove-all-profiles-btn");
const videoCountValues = [1, 2, 4];
const settingsCheckBoxes = document.querySelectorAll("#settings-panel-container input[type='checkbox']");

let DEBUGGING = false;

// OPFS operation queue counter to prevent rerendering source selectors and video list until all queued operations are finished. This is needed because OPFS operations are async and we don't want to trigger multiple renders while there are still pending operations that will update the state. When an OPFS operation is started, rendering the source selectors cause an interruption of the ongoing OPFS operations. This is likely due to the fact that rendering source selectors involves updating the DOM, which can cause the browser to prioritize user interactions and rendering over ongoing async operations. By using a counter to track the number of queued OPFS operations, we can ensure that we only trigger a render after all operations have completed, preventing any potential interruptions and ensuring a smoother user experience.
let queuedOPFSOperationsCount = 0;
let notificationOperations

const activeUploadsGlobal = new Map(); 
const activeUploadsSet = new Set();
// key: video.id
// value: { controller, promise }


const OPFSDiskUsage = document.getElementById("opfs-disk-usage");

// const vpElement = document.getElementById("vp");

let vp; // Video.js player instance

const emojiMap = {
	checked: "✅",
	unchecked: "❌",
	checkmark: "✔️",
	lightCheckmark: "✔️",
	absent: "❎",
	present: "✅",
	save: "💾",
	edit: "✏️",
	cancel: "✕",
	cancel2: "✖️",
};

// Video Upload Elements
// const videoUploadInputs = document.querySelectorAll(".video_upload_input");
// const posterUploadInputs = document.querySelectorAll(".poster_upload_input");
const sourceSelectorsContainer = document.getElementById("source-selectors-container");
const sourceSelectorSection = document.getElementById("source-selector-section");

let countDownInterval = 2000
let clickCount = 0;
const clickCountUpperLimit = 1;
let intervalId;

const state = {
	profiles: localStorage.getItem("profiles") ? 
			JSON.parse(localStorage.getItem("profiles")) :
			[
				{
					id: 0,
					originalName: "Varsayılan",
					OPFSName: "Varsayılan",
					displayName: "Varsayılan",
					opfsProfileDirectoryHandle: null,
					videoCount: 1,
					videos: [
						{
							id: 0,
							originalFileName: "",
							storedFileName: "",
							displayTitle: "",
							src: "",
							poster: "",
							posterTitle: "",
							alt: "",
							currentTime: 0,
							size: 0,
						}
					]
				}
			],
	get profileNames() {
		return this.profiles.map(p => ({id: p.id, originalName: p.originalName, OPFSName: p.OPFSName, displayName: p.displayName}));
	},
	get profileNamesSet() {
		return new Set(this.profiles.map(p => p.displayName));
	},
	currentProfileId: localStorage.getItem("currentProfileId") ?
		JSON.parse(localStorage.getItem("currentProfileId")) :
		0,
	profileIdCounter: localStorage.getItem("profileIdCounter") ?
		JSON.parse(localStorage.getItem("profileIdCounter")) :
		1,
	currentlyPlayingVideoId: null,
	currentVolume: localStorage.getItem("currentVolume") ? 
		JSON.parse(localStorage.getItem("currentVolume")) :
		1,
	player_settings: {
		THUMBNAIL_GENERATION_TIME: localStorage.getItem("THUMBNAIL_GENERATION_TIME") ?
			JSON.parse(localStorage.getItem("THUMBNAIL_GENERATION_TIME")) :
			10,
		showVideoControls: localStorage.getItem("showVideoControls") ?
			JSON.parse(localStorage.getItem("showVideoControls")) :
			true,
		controlBarChildrenState: localStorage.getItem("controlBarChildrenState") ?
			JSON.parse(localStorage.getItem("controlBarChildrenState")) :
			{
				"play": true,
				"progress": true,
				"volume": true,
				"time": true,
				"timeDivider": true,
				"duration": true,
				// "remaining": false,
				// "rate": false,
				// "pip": false,
				"fullscreen": true,
			},
		playbackSettings: localStorage.getItem("playbackSettings") ?
			JSON.parse(localStorage.getItem("playbackSettings")) :
			{
				rememberVolumeLevel: true,
				rememberVideoTime: true,
				touchControlsEnabled: true,
			}
	},
	uiSettings: {
		showOverlays: localStorage.getItem("showOverlays") ?
			JSON.parse(localStorage.getItem("showOverlays")) :
			true,
	}
}

/* Check for File System Access API */
const supportsFS = 'showOpenFilePicker' in window;
/* Check for OPFS support */
const supportsOPFS = 'storage' in navigator && 'getDirectory' in navigator.storage;
if (!supportsFS && !supportsOPFS) {
	alert("Bu tarayıcı Dosya Sistemi Erişim API'sini ve OPFS'yi desteklemiyor. Lütfen uyumlu bir tarayıcı kullanın (örneğin, Chrome 86+).");
}

// Get OPFS root handle
let opfsRoot;
let butlerVideosDirectoryHandle;
let opfsInitPromise = (async function getOpfsRoot(){
	if (supportsOPFS) {
		opfsRoot = await navigator.storage.getDirectory();
		try {
			butlerVideosDirectoryHandle = await opfsRoot.getDirectoryHandle("ButlerVideos", {create: true});
		} catch (error) {
			console.error("No directory named 'ButlerVideos' and could not create one: ", error);
		}
	} else {
		opfsRoot = null;
		alert("Bu tarayıcı OPFS'yi desteklemiyor. Lütfen uyumlu bir tarayıcı kullanın (örneğin, Chrome 86+).");
		console.error("OPFS is not supported in this browser!");
		return;
	}
	for (const profile of state.profiles) {
		const opfsProfileDirectoryHandle  = await butlerVideosDirectoryHandle.getDirectoryHandle(profile.OPFSName, {create: true});
		await cleanZeroByteFilesFromDirectory(opfsProfileDirectoryHandle);
		profile.opfsProfileDirectoryHandle = opfsProfileDirectoryHandle;
		for (video of profile.videos) {
			if (video.storedFileName !== "") {
				// console.log(`Getting video handle for ${video.storedFileName} in profile diplayName: ${profile.displayName}, OPFSName: ${profile.OPFSName}`);
				try {
					const opfsVideoHandle = await opfsProfileDirectoryHandle.getFileHandle(video.storedFileName);
					// console.log(`Got video handle for ${video.storedFileName} in profile ${profile.displayName}: `, opfsVideoHandle);
					try {
						const opfsVideoFile = await opfsVideoHandle.getFile();
						video.src = URL.createObjectURL(opfsVideoFile);
						// console.log(`Created object URL for ${video.storedFileName} in profile ${profile.displayName}: `, video.src);
					} catch (err) {
						console.error("Could not create object URL from file handle:", err);
					}
				} catch (error) {
					console.error("Could not get video handle: ", error);
				}
			}
			if (video.posterTitle !== "") {
				// console.log(`Video ${video.storedFileName} in profile ${profile.displayName} has a poster: ${video.poster}`);
				try {
					const thumbnailHandle = await opfsProfileDirectoryHandle.getFileHandle(video.posterTitle);
					// console.log(`Got thumbnail handle for ${video.storedFileName} in profile ${profile.displayName}: `, thumbnailHandle);
					try {
						const opfsThumbnailFile = await thumbnailHandle.getFile();
						video.poster = URL.createObjectURL(opfsThumbnailFile);
						video.posterTitle = thumbnailHandle.name;
						// console.log(`Created object URL for thumbnail of ${video.storedFileName} in profile ${profile.displayName}: `, video.poster);
					} catch (err) {
						console.error("Could not create object URL from thumbnail handle:", err);
					}
				} catch (error) {
					console.error("Could not get thumbnail handle: ", error);
				}
			}
		}
	}
})();

async function cacheVideoFileToOPFS(e) {
    const blobData = e.target.files[0];
	const thumbnailBlobData = await generateThumbnail(URL.createObjectURL(blobData)).then(thumbnailUrl => {
		return fetch(thumbnailUrl).then(res => res.blob());	
	}).catch(err => {
		console.error("Error generating thumbnail blob: ", err);
		alert("Video biçimi desteklenmediği için poster oluşturulamadı. Lütfen farklı bir video dosyası seçin.");
		return null;
	});
    // Create or open a file in the OPFS
    const fileHandle = await root.getFileHandle(blobData.name, { create: true });
	const thumbnailFileHandle = await root.getFileHandle(`thumbnail_${blobData.name}.jpg`, { create: true });

    // state.fileHandle = fileHandle;
    state.fileName = blobData.name;
	state.thumbnailFileName = `thumbnail_${blobData.name}.jpg`;
    saveState();

    if (!blobData || !validVideoFileType(blobData)) {
        alert("Please select a valid video file.");
        return;
    }
    // Write to it
    const writable = await fileHandle.createWritable();
    if (blobData) {
		await writable.write(blobData);
		await writable.close();
	}

	const thumbnailWritable = await thumbnailFileHandle.createWritable();
	if (thumbnailBlobData) {
		await thumbnailWritable.write(thumbnailBlobData);
		await thumbnailWritable.close();
	}
    

	storageInfo();

    // Read it later
    const file = await fileHandle.getFile();
	const thumbnailFile = await thumbnailFileHandle.getFile();
    const url = URL.createObjectURL(file);
	const thumbnailUrl = URL.createObjectURL(thumbnailFile);
    vp.src = url;
	vp.poster = thumbnailUrl;
}

function saveState() {
	localStorage.setItem("profiles", JSON.stringify(state.profiles));
	localStorage.setItem("currentProfileId", JSON.stringify(state.currentProfileId));
	localStorage.setItem("profileIdCounter", JSON.stringify(state.profileIdCounter));
	localStorage.setItem("currentVolume", JSON.stringify(state.currentVolume));
	localStorage.setItem("THUMBNAIL_GENERATION_TIME", JSON.stringify(state.player_settings.THUMBNAIL_GENERATION_TIME)),
	localStorage.setItem("showVideoControls", JSON.stringify(state.player_settings.showVideoControls));
	localStorage.setItem("controlBarChildrenState", JSON.stringify(state.player_settings.controlBarChildrenState));
	localStorage.setItem("playbackSettings", JSON.stringify(state.player_settings.playbackSettings));
	localStorage.setItem("showOverlays", JSON.stringify(state.uiSettings.showOverlays));
	localStorage.setItem("videos", JSON.stringify(state.profiles.find(p => p.id === state.currentProfileId).videos));
}

/* Confirmation Modal Utility */
function showConfirmModal(title, message, okButtonText) {
	return new Promise((resolve) => {
		const overlay = document.getElementById("confirm-modal-overlay");
		const titleEl = document.getElementById("confirm-modal-title");
		const messageEl = document.getElementById("confirm-modal-message");
		const okBtn = document.getElementById("confirm-modal-ok-btn");
		const cancelBtn = document.getElementById("confirm-modal-cancel-btn");

		titleEl.textContent = title;
		messageEl.innerHTML = message;
		okBtn.textContent = okButtonText;

		// Temporarily close settings dialog so modal appears on top
		const settingsWasOpen = settingsPanelContainer.open;
		if (settingsWasOpen) {
			settingsPanelContainer.close();
		}

		const cleanup = () => {
			overlay.style.display = "none";
			okBtn.removeEventListener("click", onOk);
			cancelBtn.removeEventListener("click", onCancel);
			// Restore settings dialog
			if (settingsWasOpen) {
				settingsPanelContainer.showModal();
			}
		};

		const onOk = () => {
			cleanup();
			resolve(true);
		};

		const onCancel = () => {
			cleanup();
			resolve(false);
		};

		okBtn.addEventListener("click", onOk);
		cancelBtn.addEventListener("click", onCancel);

		overlay.style.display = "flex";
	});
}

/* Notification Modal Utility */
function showNotificationModal(title, message, okButtonText) {
	const overlay = document.getElementById("notification-modal-overlay");
	const titleEl = document.getElementById("notification-modal-title");
	const messageEl = document.getElementById("notification-modal-message");
	const okBtn = document.getElementById("notification-modal-ok-btn");

	titleEl.textContent = title;
	messageEl.innerHTML = message;
	okBtn.textContent = okButtonText;

	// Temporarily close settings dialog so modal appears on top
	const settingsWasOpen = settingsPanelContainer.open;
	if (settingsWasOpen) {
		settingsPanelContainer.close();
	}

	const cleanup = () => {
		overlay.style.display = "none";
		okBtn.removeEventListener("click", onOk);
		// Restore settings dialog
		if (settingsWasOpen) {
			settingsPanelContainer.showModal();
		}
	};

	const onOk = () => {
		cleanup();
	};

	okBtn.addEventListener("click", onOk);

	overlay.style.display = "flex";
}

showTheButton.addEventListener("click", () => {
	settingsBtn.style.display = "block";
	intervalId = setTimeout(() => {
		settingsBtn.style.display = "none";
		clickCount = 0;
	}, countDownInterval);
});

settingsBtn.addEventListener("click", () => {
	if (clickCount < clickCountUpperLimit) {
		clickCount++;
		countDownInterval = 2000;
		clearInterval(intervalId);
		intervalId = setTimeout(() => {
			settingsBtn.style.display = "none";
			clickCount = 0;
		}, countDownInterval);
		return;
	} else {
		settingsPanelContainer.showModal();
		settingsBtn.style.display = "none";
		clickCount = 0;
	}
});

closeSettingsBtns.forEach(btn => {
	btn.addEventListener("click", () => {
		settingsPanelContainer.close();
	});
});

profileNameInput.addEventListener("keydown", (e) => {
	if (e.key === "Enter") {
		e.preventDefault();
		addProfileBtn.click();
		e.target.value = "";
	}
});

addProfileBtn.addEventListener("click", async () => {
	if (state.profileNames.map(p => p.displayName).includes(profileNameInput.value.trim())) {
		console.log(state.profileNames);
		console.log(profileNameInput.value.trim());
		if (profileListContainer.querySelector("#duplicate-profile-alert")) {
			return;
		}
		const alertDiv = document.createElement("div");
		alertDiv.className = "alert alert-warning";
		alertDiv.role = "alert";
		alertDiv.id = "duplicate-profile-alert";
		alertDiv.textContent = "Bu isimde zaten bir profil var. Lütfen farklı bir isim girin.";
		addProfileSection.appendChild(alertDiv);
		setTimeout(() => {
			if (addProfileSection.contains(alertDiv)) {
				addProfileSection.removeChild(alertDiv);
			}
		}, 3000);	
		return;
	}
	// const newProfileId = state.profiles.length > 0 ? Math.max(...state.profiles.map(p => p.id)) + 1 : 0;
	const newProfileId = state.profileIdCounter++;

	const newProfile = {
		// id: state.profiles.length,
		id: newProfileId,
		originalName: `${profileNameInput.value !== "" ? profileNameInput.value : `Profil ${newProfileId}`}`,
		OPFSName: `${profileNameInput.value !== "" ? `${profileNameInput.value}_${newProfileId}` : `Profil ${newProfileId}`}`,
		displayName: `${profileNameInput.value !== "" ? profileNameInput.value : `Profil ${newProfileId}`}`,
		opfsProfileDirectoryHandle: await butlerVideosDirectoryHandle.getDirectoryHandle(`${profileNameInput.value !== "" ? `${profileNameInput.value}_${newProfileId}` : `Profil ${newProfileId}`}`, {create: true}),
		videoCount: 1,
		videos: [
			{
				id: 0,
				storedFileName: "",
				displayTitle: "",
				src: "",
				poster: "",
				posterTitle: "",
				alt: "",
				currentTime: 0,
				size: 0,
			}
		]
	};
	profileNameInput.value = "";
	state.profiles.push(newProfile);
	state.currentProfileId = newProfileId;
	saveState();
	renderProfileSelectList();
	renderProfileList();
	renderSourceSelectors();
	renderVideoCountSelector();
	renderVideoList();
});

removeProfileBtn.addEventListener("click", async () => {
	const checkboxes = profileListContainer.querySelectorAll("input[type='checkbox']:checked");
	const idsToRemove = Array.from(checkboxes).map(checkbox => parseInt(checkbox.value)).filter(id => id !== 0 && state.profileNames.find(p => p.id === id)?.name !== "Varsayılan");
	if (idsToRemove.length === 0) {
		if (profileListContainer.querySelector("#remove-profiles-alert")) {
			return;
		}
		const alertDiv = document.createElement("div");
		alertDiv.className = "alert alert-warning";
		alertDiv.role = "alert";
		alertDiv.id = "remove-profiles-alert";
		alertDiv.textContent = "Lütfen silinecek profilleri seçin (Varsayılan profil silinemez).";
		profileListContainer.prepend(alertDiv);
		setTimeout(() => {
			if (profileListContainer.contains(alertDiv)) {
				profileListContainer.removeChild(alertDiv);
			}
		}, 3000);
		return;
	}
	
	// Process profiles sequentially so we can await confirmations and act on the user's choice.
	const profilesToCheck = state.profiles.filter(profile => idsToRemove.includes(profile.id));
	for (const profile of profilesToCheck) {
		if (profile.videos && profile.videos.length > 0 && profile.videos.some(video => video.src && video.src !== "")) {
			const confirmationMessage = `
				<strong>${profile.displayName}</strong> profilinde <strong>${profile.videos.filter(video => video.src && video.src !== "").length} adet video</strong> var:<br>
				<ul>
				${profile.videos.filter(video => video.src && video.src !== "").map(video => `<li>${video.displayTitle}</li>`).join("")}
				</ul>
				Bu profili silmek, bu videoların tarayıcı hafızasından kalıcı olarak silinmesine neden olacak. <strong>Bu işlem geri alınamaz.</strong><br><br>Devam etmek istediğinize emin misiniz?
			`;
			const confirmed = await showConfirmModal("Dikkat", confirmationMessage, "Sil");
			if (!confirmed) {
				const idx = idsToRemove.indexOf(profile.id);
				if (idx !== -1) idsToRemove.splice(idx, 1);
				continue;
			}

			// user confirmed -> revoke object URLs and remove OPFS directory
			for (const video of profile.videos) {
				if (video.src && video.src !== "") URL.revokeObjectURL(video.src);
				if (video.poster && video.poster !== "") URL.revokeObjectURL(video.poster);
			}

			if (butlerVideosDirectoryHandle && profile.opfsProfileDirectoryHandle) {
				await butlerVideosDirectoryHandle.removeEntry(profile.opfsProfileDirectoryHandle.name, { recursive: true }).catch(() => {});
				storageInfo();
			}
		} else {
			if (butlerVideosDirectoryHandle && profile.opfsProfileDirectoryHandle) {
				await butlerVideosDirectoryHandle.removeEntry(profile.opfsProfileDirectoryHandle.name, { recursive: true }).catch(() => {});
				storageInfo();
			}
		}
	}
	// storageInfo();
	state.profiles = state.profiles.filter(profile => !idsToRemove.includes(profile.id));
	// if (state.currentProfileId >= state.profiles.length) {
	// 	state.currentProfileId = 0;
	// }
	state.currentProfileId = 0; // switch to the first profile after deletion
	saveState();
	renderProfileSelectList();
	renderProfileList();
	renderVideoCountSelector();
	renderSourceSelectors()
	renderVideoList();
});

removeAllProfilesBtn.addEventListener("click", async () => {
	if (state.profiles.length <= 1) {
		if (profileListContainer.querySelector("#remove-all-profiles-alert")) {
			return;
		}
		const alertDiv = document.createElement("div");
		alertDiv.className = "alert alert-warning";
		alertDiv.id = "remove-all-profiles-alert";
		alertDiv.role = "alert";
		alertDiv.textContent = "Silinecek başka profil yok (Varsayılan profil silinemez).";
		profileListContainer.prepend(alertDiv);
		setTimeout(() => {
			if (profileListContainer.contains(alertDiv)) {
				profileListContainer.removeChild(alertDiv);
			}
		}, 3000);
		return;
	}

	const confirmationMessage = `<strong>Tüm profilleri silmek istediğinize emin misiniz?</strong><br><br>Bu işlem, "Varayılan" profil hariç tüm profillerdeki videoların tarayıcı hafızasından kalıcı olarak silinmesine neden olacak. <strong>Bu işlem geri alınamaz.</strong>`;

	const confirmed = await showConfirmModal("Dikkat", confirmationMessage, "Tümünü Sil");

	if (!confirmed) {
		return;
	} else {
		(async () => {
			
			const profilesToRemove = state.profiles.filter(profile => profile.id !== 0 && state.profileNames.find(p => p.id === profile.id)?.displayName !== "Varsayılan");
			for (const profile of profilesToRemove) {
				if (profile.videos && profile.videos.length > 0) {
					for (const video of profile.videos) {
						if (video.src !== "") {
							URL.revokeObjectURL(video.src);
						}
						if (video.poster) {
							URL.revokeObjectURL(video.poster);
						}
					}
				}
				if (butlerVideosDirectoryHandle && profile.opfsProfileDirectoryHandle) {
					await butlerVideosDirectoryHandle.removeEntry(profile.opfsProfileDirectoryHandle.name, { recursive: true }).catch(() => {});
					storageInfo();
				}
			}
		})();
		state.profiles = state.profiles.filter(profile => profile.id === 0 || profile.displayName === "Varsayılan");
		state.currentProfileId = 0;
	}
	
	saveState();
	renderProfileSelectList();
	renderProfileList();
	renderVideoCountSelector();
	renderSourceSelectors();
	renderVideoList();
});

// TODO: Add settings section for player controls (like volume, autoplay, loop, etc.) and save those settings in state and apply them to the player instance
document.addEventListener("DOMContentLoaded", async () => {
	await opfsInitPromise;
	storageInfo();
	vp = videojs("vp", {
		controls: true,
		fluid: true,
		autoplay: false,
		preload: 'auto',
		loadingSpinner: true,
		// userActions: {
		// 	hotkeys: true,
		//  click: false,
		//  click: myClickHandler,
		//  doubleClick: myDoubleClickHandler
		// },
		playbackRates: [], // ← disables PlaybackRateMenuButton entirely
		controlBar: {
			pictureInPictureToggle: false, // ← disables PiP completely
			remainingTimeDisplay: false, // ← disables just the current time text
			// VolumePanel: {
			// 	inline: false
			// },
			// children: [
			// 	'PlayToggle',
			// 	'ProgressControl',
			// 	// 'TimeDisplay',
			// 	// 'CurrentTimeDisplay',
			// 	// 'TimeDivider',
			// 	// 'DurationDisplay',
			// 	// 'RemainingTimeDisplay',
			// 	'VolumePanel',
			// 	'FullscreenToggle',
			// 	// 'PlayToggle',
			// 	// 'ProgressControl',
			// 	// 'TimeDisplay',           // ← THIS is the correct component
			// 	// 'RemainingTimeDisplay',  // optional
			// 	// 'VolumePanel',
			// 	// 'FullscreenToggle',
			// ],
			// skipButtons: {
			// 	forward: 5
			// },
		},
		// userActions: {
		// 	hotkeys: function(event) {
		// 		// `this` is the player in this context

		// 		// `x` key = pause
		// 		if (event.which === 88) {
		// 			this.pause();
		// 		}
		// 		// `y` key = play
		// 		if (event.which === 89) {
		// 			this.play();
		// 		}
		// 	}
		// },
		plugins: {
			hotkeys: {
				volumeStep: 0.05,
				seekStep: 5,
				// enableModifiersForNumbers: false,
				// enableFullscreen: false,
				// enableMute: true,
			},
		},
	});
	vp.on('loadedmetadata', applyVideoControlBarState);
	vp.on('componentresize', applyVideoControlBarState);
	vp.on('loadstart', applyVideoControlBarState);
	vp.mobileUi({
		fullscreen: {
			enterOnRotate: true,
			exitOnRotate: false,
			lockOnRotate: false,
			lockToLandscapeOnEnter: false,
			disabled: false,
		},
		touchControls: {
			seekSeconds: 10,
			tapTimeout: 300,
			disableOnEnd: false,
			disabled: !state.player_settings.playbackSettings.touchControlsEnabled,
		},
		forceForTesting: true,
	});

	vp.on("volumechange", () => {
		state.currentVolume = vp.volume();
		localStorage.setItem("currentVolume", state.currentVolume);
	});

	vp.on('ended', () => {
		if (document.fullscreenElement) {
			closeFullscreen();
		}
		vp.pause();
		vp.currentTime(0);
		vp.volume(state.player_settings.playbackSettings.rememberVolumeLevel ? state.currentVolume : 0.8);
		document.getElementById('vp').style.display = 'none';
	});

	vp.on('keydown', (e) => {
		if (!vp.isFullscreen() && (e.key === " " || e.code === "Space")) {
			vp.pause();
			return false;
		}
	});

	const controlBar = vp.getChild('ControlBar');

	const controls = {
		play: controlBar.getChild('PlayToggle'),
		progress: controlBar.getChild('ProgressControl'),
		volume: controlBar.getChild('VolumePanel'),
		time: controlBar.getChild('CurrentTimeDisplay'),
		timeDivider: controlBar.getChild('TimeDivider'),
		duration: controlBar.getChild('DurationDisplay'),
		// remaining: controlBar.getChild('RemainingTimeDisplay'),
		// rate: controlBar.getChild('PlaybackRateMenuButton'),
		// pip: controlBar.getChild('PictureInPictureToggle'),
		fullscreen: controlBar.getChild('FullscreenToggle'),
	};

	initSettingsPanelInputs();

	settingsCheckBoxes.forEach(checkbox => {
		const key = checkbox.dataset.key;
		checkbox.addEventListener("change", (e) => {
			if (key) {
				switch(key) {
					case "showVideoControls":
						e.target.checked ? vp.controlBar.show() : vp.controlBar.hide();
						state.player_settings.showVideoControls = e.target.checked;
						break;
					case "rememberVolumeLevel":
						state.player_settings.playbackSettings.rememberVolumeLevel = e.target.checked;
						break;
					case "rememberVideoTime":
						state.player_settings.playbackSettings.rememberVideoTime = e.target.checked;
						break;
					case "showVideoTitles":
						state.uiSettings.showOverlays = e.target.checked;
						updateOverlayDisplay(e.target.checked);
						break;
					case "time":
						state.player_settings.controlBarChildrenState.time = e.target.checked;
						controls.time ? (e.target.checked ? controls.time.show() : controls.time.hide()) : null;
						state.player_settings.controlBarChildrenState.timeDivider = e.target.checked;
						controls.timeDivider ? (e.target.checked ? controls.timeDivider.show() : controls.timeDivider.hide()) : null;
						state.player_settings.controlBarChildrenState.duration = e.target.checked;
						controls.duration ? (e.target.checked ? controls.duration.show() : controls.duration.hide()) : null;
						break;
					case "touchControlsEnabled":
						const enabled = e.target.checked;
						state.player_settings.playbackSettings.touchControlsEnabled = enabled;
						initPlayer(enabled);
						// setTouchControls(enabled);
						// vp.mobileUi().options_.touchControls.disabled = !enabled;
						break;
					default:
						state.player_settings.controlBarChildrenState[key] = e.target.checked;
						controls[key] ? (e.target.checked ? controls[key].show() : controls[key].hide()) : null;
						break;
				}
				saveState();
			}
			// TODO: implement the following funnctions to apply the changes immediately when a setting is toggled, instead of waiting for the user to close the settings dialog:
			// applyControlState();
		});
	});


	videoCountSelector.value = state.videoCount;
	const currentProfile = state.profiles.find(p => p.id === state.currentProfileId);
	if (currentProfile && (currentProfile.videos.length === 0 || currentProfile.videos.length !== currentProfile.videoCount)) {
		updateVideoList();
	}
	videoCountSelector.addEventListener("change", async (e) => {
		const count = parseInt(e.target.value);
		if (!videoCountValues.includes(count)) return;

		const currentProfile = state.profiles.find(p => p.id === state.currentProfileId);
		const oldCount = currentProfile.videoCount || 1;
		if (count === oldCount) return;

		// Decreasing count -> compact and possibly delete overflow videos
		if (count < oldCount) {
			// Collect videos that actually have a source (preserve order)
			const videosWithSource = currentProfile.videos.filter(v => v && v.src && v.src !== "");
			const toKeep = videosWithSource.slice(0, count);
			const toDelete = videosWithSource.slice(count);

			if (toDelete.length > 0) {
				const names = toDelete.map(v => v.displayTitle || `Slot ${v.id + 1}`).join('<br>');
				const prefix1 = oldCount === 2 ? "den" : "ten";
				const prefix2 = count === 1 ? "e" : "ye";
				const message = `
					<strong>Video sayısını ${oldCount}'${prefix1} ${count}'${prefix2} değiştirmek istiyorsunuz.</strong><br><br>
					<strong>${toDelete.length} video tarayıcı hafızasından kalıcı olarak silinecek:</strong><br>
					<ul>
						${names.split('<br>').map(n => `<li>${n}</li>`).join('')}
					</ul>
				`;
				const confirmed = await showConfirmModal("Dikkat", message, "Devam Et");
				
				if (!confirmed) {
					// revert select value
					e.target.value = oldCount;
					return;
				}

				// Remove files and revoke object URLs for deleted videos
				for (const v of toDelete) {
					try {
						if (v.src && v.src.startsWith('blob:')) URL.revokeObjectURL(v.src);
						if (v.poster && v.poster.startsWith('blob:')) URL.revokeObjectURL(v.poster);
						if (butlerVideosDirectoryHandle && currentProfile.opfsProfileDirectoryHandle && v.title) {
							await currentProfile.opfsProfileDirectoryHandle.removeEntry(v.title).catch(() => {});
						}
						if (butlerVideosDirectoryHandle && currentProfile.opfsProfileDirectoryHandle && v.posterTitle) {
							await currentProfile.opfsProfileDirectoryHandle.removeEntry(v.posterTitle).catch(() => {});
						}
					} catch (err) {
						console.error('Fazla videoları tarayıcı hafızasından silerken hata oluştu:', err);
					}
				}
				storageInfo();
			}

			// Rebuild compacted list of length `count` (fill remaining slots with empty placeholders)
			const newVideos = [];
			for (let i = 0; i < count; i++) {
				if (toKeep[i]) {
					newVideos.push(Object.assign({}, toKeep[i], { id: i }));
				} else {
					newVideos.push({ id: i, storedFileName: "", displayTitle: "", src: "", poster: "", posterTitle: "", alt: "", currentTime: 0, size: 0 });
				}
			}

			currentProfile.videos = newVideos;
			currentProfile.videoCount = count;
			saveState();
			updateVideoList();
			renderSourceSelectors();
			renderVideoList();
			return;
		}

		// Increasing count or changing to a larger value: just expand slots
		currentProfile.videoCount = count;
		// Ensure array has the correct length
		for (let i = currentProfile.videos.length; i < count; i++) {
			currentProfile.videos[i] = { id: i, storedFileName: "", displayTitle: "", src: "", poster: "", posterTitle: "", alt: "", currentTime: 0, size: 0 };
		}
		saveState();
		updateVideoList();
		renderVideoList();
		renderSourceSelectors();
	});
	renderVideoList();
	renderProfileSelectList();
	renderProfileList();
	renderVideoCountSelector();
	renderSourceSelectors();
});

function renderProfileSelectList() {
	profileSelect.innerHTML = "";
	for (const profile of state.profiles) {
		const option = document.createElement("option");
		option.value = profile.id;
		option.textContent = profile.displayName || profile.originalName;
		if (profile.id === state.currentProfileId) {
			option.selected = true;
		} else if (state.profiles.length === 1) {
			option.selected = true;
		}
		profileSelect.appendChild(option);
	}
}

profileSelect.addEventListener("change", (e) => {
	state.currentProfileId = parseInt(e.target.value);
	saveState();
	renderProfileList();
	renderVideoCountSelector();
	renderSourceSelectors();
	renderVideoList();
});

function renderProfileList() {
	profileListContainer.innerHTML = "";
	
	const selectAllLi = document.createElement("li");
	selectAllLi.className = "profile-list-select-all-items";
	const selectAllCheckBox = document.createElement("input");
	selectAllCheckBox.className = "form-check-input";
	selectAllCheckBox.type = "checkbox";
	selectAllCheckBox.name = "select_all_profiles";
	selectAllCheckBox.id = "select_all_profiles";
	selectAllCheckBox.value = "select_all";
	selectAllCheckBox.addEventListener("change", (e) => {
		const isChecked = e.target.checked;
		const checkboxes = profileListContainer.querySelectorAll("input[type='checkbox']");
		checkboxes.forEach(checkbox => {
			if (checkbox.id === 0 || checkbox.value === "0" || state.profiles.find(p => p.name === checkbox.value) === "Varsayılan") {
				return;
			}
			checkbox.checked = isChecked;
		});
	});
	const selectAllLabel = document.createElement("label");
	selectAllLabel.className = "form-check-label";
	selectAllLabel.htmlFor = "select_all_profiles";
	selectAllLabel.textContent = "Tümünü seç";

	selectAllLi.appendChild(selectAllCheckBox);
	selectAllLi.appendChild(selectAllLabel);
	profileListContainer.appendChild(selectAllLi);

	for (const profile of state.profiles) {
		const li = document.createElement("li");
		li.className = "profile-list-item";

		const checkBox = document.createElement("input");
		checkBox.className = "form-check-input";
		checkBox.type = "checkbox";
		checkBox.name = `profile_${profile.id}_select`;
		checkBox.id = `profile_${profile.id}_select`;
		checkBox.value = profile.id;

		if (profile.id === 0 || profile.displayName === "Varsayılan") {
			checkBox.disabled = true;
		}

		const label = document.createElement("label");
		label.className = "form-check-label";
		label.htmlFor = `profile_${profile.id}_select`;
		label.textContent = profile.displayName;

		li.appendChild(checkBox);
		li.appendChild(label);

		label.addEventListener("focusout", () => {
			if (label.textContent.trim() === "") {
				label.textContent = profile.displayName;
			}
		});

		if (profile.id !== 0 && profile.displayName !== "Varsayılan") {
			const editProfileNameBtn = document.createElement("button");
			const saveProfileNameBtn = document.createElement("button");
			const cancelEditBtn = document.createElement("button");

			editProfileNameBtn.type = "button";
			editProfileNameBtn.className = "btn btn-sm btn-secondary edit-profile-name-btn settings-btn";
			editProfileNameBtn.textContent = emojiMap.edit;
			editProfileNameBtn.addEventListener("click", () => {
				label.contentEditable = true;
				label.focus();
				checkBox.disabled = true;
				checkBox.style.cursor = "none";
				// label.style.color = "#81ff76";
				if (label.style.color === "") {
					label.style.color = "#fcf810";
				} 
				label.style.opacity = "1";
				label.style.border = "1px dashed #fcf810";
				label.style.cursor = "text";
				// select text content				
				const range = document.createRange();
				range.selectNodeContents(label);
				const sel = window.getSelection();
				sel.removeAllRanges();
				sel.addRange(range);
				cancelEditBtn.disabled = false;
			});

			saveProfileNameBtn.type = "button";
			saveProfileNameBtn.className = "btn btn-sm btn-secondary save-profile-name-btn settings-btn";
			saveProfileNameBtn.innerHTML = emojiMap.save;

			saveProfileNameBtn.addEventListener("click", () => {
				label.contentEditable = false;
				label.style.border = "none";
				label.style.cursor = "pointer";
				// const currentProfile = state.profiles.find(p => p.id === profile.id);
				const profileName = profile.displayName;
				if (profileName === label.textContent.trim()) {
					label.contentEditable = false;
					label.style.border = "none";
					label.style.cursor = "pointer";
					label.style.color = "";
					label.textContent = profile.displayName;
					checkBox.disabled = false;
					checkBox.style.cursor = "pointer";
					cancelEditBtn.disabled = true;
					return;
				}
				if (state.profiles.map(p => p.displayName).includes(label.textContent.trim())) {
					console.log(state.profiles);
					console.log(profileNameInput.value.trim());
					if (profileListContainer.querySelector("#duplicate-profile-alert")) {
						editProfileNameBtn.click();
						return;
					}
					const alertDiv = document.createElement("div");
					alertDiv.className = "alert alert-warning";
					alertDiv.role = "alert";
					alertDiv.id = "duplicate-profile-alert";
					alertDiv.textContent = `"${label.textContent.trim()}" isimli bir profil zaten var. Lütfen farklı bir isim girin.`;
					li.insertAdjacentElement("beforebegin", alertDiv);
					editProfileNameBtn.click();
					setTimeout(() => {
						if (profileListContainer.contains(alertDiv)) {
							profileListContainer.removeChild(alertDiv);
						}
					}, 3000);
				} else {
					profile.displayName = label.textContent.trim();
					checkBox.disabled = false;
					checkBox.style.cursor = "pointer";
	
					saveState();
					renderProfileList();
					renderProfileSelectList()
				}
			});

			cancelEditBtn.type = "button";
			cancelEditBtn.className = "btn btn-sm btn-secondary cancel-edit-profile-name-btn settings-btn";
			cancelEditBtn.textContent = emojiMap.cancel;
			cancelEditBtn.disabled = true;
			cancelEditBtn.addEventListener("click", () => {
				label.contentEditable = false;
				label.style.border = "none";
				label.style.cursor = "pointer";
				label.style.color = "";
				label.textContent = profile.displayName;
				checkBox.disabled = false;
				checkBox.style.cursor = "pointer";
				cancelEditBtn.disabled = true;
			});
			label.addEventListener("keydown", (e) => {
				if (e.key === "Enter") {
					e.preventDefault();
					if (profile.displayName === label.textContent.trim()) {
						label.contentEditable = false;
						label.style.border = "none";
						label.style.cursor = "pointer";
						label.style.color = "";
						label.textContent = profile.displayName;
						checkBox.disabled = false;
						checkBox.style.cursor = "pointer";
						cancelEditBtn.disabled = true;
						return;
					}
					if (state.profiles.map(p => p.displayName).includes(label.textContent.trim())) {
						if (profileListContainer.querySelector("#duplicate-profile-alert")) {
							return;
						}
						const alertDiv = document.createElement("div");
						alertDiv.className = "alert alert-warning";
						alertDiv.role = "alert";
						alertDiv.id = "duplicate-profile-alert";
						alertDiv.textContent = `"${label.textContent.trim()}" isimli bir profil zaten var. Lütfen farklı bir isim girin.`;
						li.insertAdjacentElement("beforebegin", alertDiv);
						editProfileNameBtn.click();
						setTimeout(() => {
							if (profileListContainer.contains(alertDiv)) {
								profileListContainer.removeChild(alertDiv);
							}
						}, 3000);
					} else {
						saveProfileNameBtn.click();
					}
				}
			});
			const profileNamesSet = state.profileNamesSet;
			label.addEventListener("input", (e) => {
				if(profileNamesSet.has(label.textContent.trim())) {
					if (profile.displayName === label.textContent.trim()) {
						label.style.color = "yellow";
					} else {
						label.style.color = "red";
					}
				} else {
					label.style.color = "limegreen";
				}
			});
			
			li.appendChild(editProfileNameBtn);
			li.appendChild(saveProfileNameBtn);
			li.appendChild(cancelEditBtn);

		}
		profileListContainer.appendChild(li);
	}
}

function renderVideoCountSelector() {
	const currentProfile = state.profiles.find(p => p.id === state.currentProfileId);
	videoCountSelector.innerHTML = "";
	for (const count of videoCountValues) {
		const option = document.createElement("option");
		option.value = count;
		option.textContent = `${count} Video`;
		if (count === currentProfile.videoCount) {
			option.selected = true;
		} else if (currentProfile.videoCount === undefined && count === 1) {
			option.selected = true;
		}
		videoCountSelector.appendChild(option);
	}
};

function renderSourceSelectors() {
	const currentProfile = state.profiles.find(p => p.id === state.currentProfileId);
	sourceSelectorSection.innerHTML = "";
	// Header Row
	const headerRow = document.createElement("div");
	headerRow.className = "source-selection-row";
	headerRow.id = "source-selection-header-row";

	const numberHeader = document.createElement("div");
	numberHeader.className = "form-header";
	numberHeader.id = "video-number-header";
	numberHeader.textContent = "#";

	const formsHeader = document.createElement("div");
	formsHeader.className = "source-selector-forms";
	formsHeader.id = "source-selector-forms-header";

	const videoSourceHeader = document.createElement("div");
	videoSourceHeader.className = "form-header";
	videoSourceHeader.id = "video-source-header";
	videoSourceHeader.textContent = "Video Kaynağı";

	const posterSourceHeader = document.createElement("div");
	posterSourceHeader.className = "form-header";
	posterSourceHeader.id = "poster-source-header";
	posterSourceHeader.textContent = "Poster Kaynağı";

	const removeAllSourcesBtn = document.createElement("button");
	removeAllSourcesBtn.type = "button";
	removeAllSourcesBtn.className = "btn btn-sm btn-warning remove-all-sources-btn settings-btn";
	removeAllSourcesBtn.id = "remove-all-sources-btn";
	// removeAllSourcesBtn.textContent = "🗑️";
	removeAllSourcesBtn.textContent = "Sil";
	removeAllSourcesBtn.addEventListener("click", async () => {
		if (currentProfile.videos.some(video => video.src && video.src !== "")) {
			const message = `
				<strong>${currentProfile.displayName}</strong> profilindeki <strong>bütün videolar</strong> tarayıcı hafızasından kalıcı olarak silinecek:<br>
				<ul>
					${currentProfile.videos.filter(video => video.src && video.src !== "").map(video => `<li>${video.displayTitle}</li>`).join('')}
				</ul>
				Bu işlem geri alınamaz.<br><br>Devam etmek istediğinize emin misiniz?
			`;
			const confirmed = await showConfirmModal("Dikkat", message, "Devam Et");
			if (!confirmed) {
				return;
			}
		}
		for (const video of currentProfile.videos) {
			if (video.src && video.src.startsWith('blob:')) {
				URL.revokeObjectURL(video.src);
			}
			if (video.poster && video.poster.startsWith('blob:')) {
				URL.revokeObjectURL(video.poster);
			}
			video.src = "";
			video.storedFileName = "";
			video.displayTitle = "";
			video.poster = "";
			video.posterTitle = "";
			video.alt = "";
			video.currentTime = 0;
			video.size = 0;
		}
		if (butlerVideosDirectoryHandle && currentProfile.opfsProfileDirectoryHandle) {
			await clearDirectoryContents(currentProfile.opfsProfileDirectoryHandle);
			// await butlerVideosDirectoryHandle.removeEntry(currentProfile.opfsProfileDirectoryHandle.name, { recursive: true });
			storageInfo();
		}
		saveState();
		renderSourceSelectors();
		renderVideoList();
	});

	formsHeader.appendChild(videoSourceHeader);
	formsHeader.appendChild(posterSourceHeader);
	headerRow.appendChild(numberHeader);
	headerRow.appendChild(formsHeader);
	headerRow.appendChild(removeAllSourcesBtn);
	sourceSelectorSection.appendChild(headerRow);

	// Video Rows
	for (const video of currentProfile.videos) {
		const controller = new AbortController();
		const signal = controller.signal;

		const rowContainer = document.createElement("div");
		rowContainer.className = "source-selection-row-container";
		const row = document.createElement("div");
		row.className = "source-selection-row";

		const rowNumber = document.createElement("div");
		rowNumber.className = "row-number";
		rowNumber.dataset.row = video.id + 1;
		rowNumber.textContent = video.id + 1;

		const forms = document.createElement("div");
		forms.className = "source-selector-forms";

		const videoForm = document.createElement("form");
		videoForm.method = "post";
		videoForm.enctype = "multipart/form-data";
		videoForm.style.width = "116px";

		const videoLabel = document.createElement("label");
		videoLabel.className = "preview upload-input-label";
		videoLabel.htmlFor = `video_upload_${video.id + 1}`;
		videoLabel.textContent = "Video Seç";

		const videoIndicator = document.createElement("span");
		videoIndicator.className = "present-or-absent";
		// const sourceIsUploadingIndicatorPath = "../img/tube-spinner-x27.svg";
		const sourceIsUploadingIndicatorPath = new URL('img/tube-spinner-x27.svg', document.baseURI).href;


		// videoIndicator.textContent = emojiMap.unchecked;

		const videoUploadInput = document.createElement("input");
		videoUploadInput.type = "file";
		videoUploadInput.name = `video_upload_${video.id + 1}`;
		videoUploadInput.id = `video_upload_${video.id + 1}`;
		videoUploadInput.className = "video_upload_input upload-input";
		videoUploadInput.accept = "video/*,.mkv,.mp4,.webm,.avi,.mov";
		videoUploadInput.multiple = false;
		videoUploadInput.style.display = "none";
		
		videoUploadInput.addEventListener("change", async (e) => {
			const input = e.target;
			videoIndicator.style.backgroundImage = `url(${sourceIsUploadingIndicatorPath})`;
			// Change clear button text to "İptal" (Cancel) during upload
			clearRowBtn.textContent = "İptal";

			// Disable the input and label before any long-running async operations
			// This prevents user from re-opening file picker during thumbnail generation or OPFS copy
			input.disabled = true;
			videoLabel.style.pointerEvents = "none";
			videoLabel.style.opacity = "0.5";
			videoLabel.style.cursor = "not-allowed";

			// Also disable poster upload input and fade it out
			posterUploadInput.disabled = true;
			posterLabel.style.pointerEvents = "none";
			posterLabel.style.opacity = "0.5";
			posterLabel.style.cursor = "not-allowed";

			
			const file = input.files ? input.files[0] : null;
			
			// const videoPosterImages = document.querySelectorAll(".video-poster-img");

			// const videoTestElement = document.createElement('video');

			if(!file) {
				alert("Dosya seçilemedi. Lütfen tekrar deneyin.");
				return;
			}

			video.originalFileName = file.name;
			
			const active = activeUploadsSet.has(file.name);

			if (active) {
				message = "Bu video zaten yükleme aşamasında.";
				showNotificationModal("Dikkat", message, "Tamam");
				input.value = "";
				// Reenable input and label since we're not proceeding with the upload
				input.disabled = false;
				videoLabel.style.pointerEvents = "";
				videoLabel.style.opacity = "";
				videoLabel.style.cursor = "";

				// Also re-enable poster upload input and fade it out
				posterUploadInput.disabled = false;
				posterLabel.style.pointerEvents = "";
				posterLabel.style.opacity = "";
				posterLabel.style.cursor = "";
				videoIndicator.style.backgroundImage = "";
				clearRowBtn.textContent = "Sil";
				return;
			}

			activeUploadsSet.add(file.name);

			const fileSizeGB = file.size / (1024 * 1024 * 1024);

			const shouldUpload = await shouldUploadVideo(file);
			
			if(!shouldUpload.supported) {
				alert(shouldUpload.reason);
				input.value = "";
				// Reenable input and label since we're not proceeding with the upload
				input.disabled = false;
				videoLabel.style.pointerEvents = "";
				videoLabel.style.opacity = "";
				videoLabel.style.cursor = "";

				// Also re-enable poster upload input and fade it out
				posterUploadInput.disabled = false;
				posterLabel.style.pointerEvents = "";
				posterLabel.style.opacity = "";
				posterLabel.style.cursor = "";
				videoIndicator.style.backgroundImage = "";
				clearRowBtn.textContent = "Sil";
				return;
			} else if (!shouldUpload?.width || !shouldUpload?.height) {
				const message = "Video boyutları alınamadı. Bu, videonun bazı cihazlarda düzgün oynatılmamasına neden olabilir. Yine de devam etmek istiyor musunuz?";
				const proceedWithoutDimensions = await showConfirmModal("Dikkat", message, "Devam Et");
				if (!proceedWithoutDimensions) {
					input.value = "";
					// Reenable input and label since we're not proceeding with the upload
					input.disabled = false;
					videoLabel.style.pointerEvents = "";
					videoLabel.style.opacity = "";
					videoLabel.style.cursor = "";

					// Also re-enable poster upload input and fade it out
					posterUploadInput.disabled = false;
					posterLabel.style.pointerEvents = "";
					posterLabel.style.opacity = "";
					posterLabel.style.cursor = "";
					videoIndicator.style.backgroundImage = "";
					clearRowBtn.textContent = "Sil";
					return;
				}
			}
			if (video.src && video.src.startsWith('blob:')) {
				URL.revokeObjectURL(video.src);
				if (butlerVideosDirectoryHandle && currentProfile.opfsProfileDirectoryHandle && video.storedFileName) {
					currentProfile.opfsProfileDirectoryHandle.removeEntry(video.storedFileName).then(() => {
						storageInfo();
					}).catch(err => {
						console.error("Error removing old video file from OPFS: ", err);
					});
				}
			}

			if (video.poster && video.poster.startsWith('blob:')) {
				URL.revokeObjectURL(video.poster);
				if (butlerVideosDirectoryHandle && currentProfile.opfsProfileDirectoryHandle && video.posterTitle) {
					currentProfile.opfsProfileDirectoryHandle.removeEntry(video.posterTitle).then(() => {
						storageInfo();
					}).catch(err => {
						console.error("Error removing old poster file from OPFS: ", err);
					});
				}
			}

			queuedOPFSOperationsCount++;
			
			let checkedFile = null;
			try {
				const handle = await currentProfile.opfsProfileDirectoryHandle.getFileHandle(file.name);
				checkedFile = await handle.getFile();
			} catch(error) {
				if (error.name === 'NotFoundError') {
					checkedFile = null;
				}
			}
				
			// const isFilePresentInOPFS = await currentProfile.opfsProfileDirectoryHandle.getFileHandle(file.name).then(() => true).catch(() => false);
			if (checkedFile && checkedFile.size === file.size && checkedFile.name === file.name) {
				videoIndicator.style.backgroundImage = "none";
				if (sourceSelectorSection.querySelector("#duplicate-file-alert")) {
					input.value = "";
					queuedOPFSOperationsCount--;
					return;
				}
				const duplicateFileAlert = document.createElement("div");
				duplicateFileAlert.id = "duplicate-file-alert";
				duplicateFileAlert.className = "alert alert-warning";
				duplicateFileAlert.role = "alert";
				const alertText = document.createElement("p");
				alertText.textContent = "Bu dosya zaten listede mevcut. Lütfen farklı bir dosya seçin.";
				duplicateFileAlert.appendChild(alertText);
				sourceSelectorSection.insertAdjacentElement("beforebegin", duplicateFileAlert);
				const closeBtn = document.createElement("button");
				closeBtn.className = "btn btn-sm btn-primary";
				closeBtn.textContent = "Tamam";
				duplicateFileAlert.appendChild(closeBtn);
				duplicateFileAlert.style.display = "block";
				closeBtn.addEventListener("click", () => {
					duplicateFileAlert.style.display = "none";
				});
				setTimeout(() => {
					if (sourceSelectorSection.parentElement.contains(duplicateFileAlert)) {
						sourceSelectorSection.parentElement.removeChild(duplicateFileAlert);
					}
				}, 5000);
				input.value = "";
				queuedOPFSOperationsCount--;

				// Reenable input and label since we're not proceeding with the upload
				input.disabled = false;
				videoLabel.style.pointerEvents = "";
				videoLabel.style.opacity = "";
				videoLabel.style.cursor = "";

				// Also re-enable poster upload input and fade it out
				posterUploadInput.disabled = false;
				posterLabel.style.pointerEvents = "";
				posterLabel.style.opacity = "";
				posterLabel.style.cursor = "";
				return;
			} else {
				// If file with same name exists but size or name doesn't match, remove it and proceed with the new upload
				if (checkedFile) {
					await currentProfile.opfsProfileDirectoryHandle.removeEntry(file.name).catch(() => {});
					storageInfo();
				}
			}

			let thumbnailFileHandle = null;
			const videoUrl = URL.createObjectURL(file);
			const thumbnailBlobData = await generateThumbnail(videoUrl).then(async thumbnailUrl => {
				return fetch(thumbnailUrl).then(res => res.blob());
			}).catch(err => {
				alert("Video için poster oluşturulurken bir hata oluştu. Video biçimi desteklenmiyor olabilir. Lütfen farklı bir video dosyası seçin.");
				console.error("Error generating thumbnail blob: ", err);
				return null;
			});

			if (!thumbnailBlobData) {
				if (butlerVideosDirectoryHandle && currentProfile.opfsProfileDirectoryHandle) {
					currentProfile.opfsProfileDirectoryHandle.removeEntry(`thumbnail_${file.name}.jpg`).catch(() => {});
					currentProfile.opfsProfileDirectoryHandle.removeEntry(file.name).catch(() => {});
				}
				videoIndicator.style.backgroundImage = "none";
				queuedOPFSOperationsCount--;
				// Re-enable input on error
				input.disabled = false;
				videoLabel.style.pointerEvents = "";
				videoLabel.style.opacity = "";
				videoLabel.style.cursor = "";
				// Also re-enable poster upload
				posterUploadInput.disabled = false;
				posterLabel.style.pointerEvents = "";
				posterLabel.style.opacity = "";
				posterLabel.style.cursor = "";
				// Restore clear button text
				clearRowBtn.textContent = "Sil";
				input.value = "";
				return;
			}

			const fileHandle = await currentProfile.opfsProfileDirectoryHandle.getFileHandle(file.name, { create: true });

			const uploadPromise = copyToOPFSWithCancel(file, fileHandle, controller.signal);
			activeUploadsGlobal.set(video.id, {
				controller,
				promise: uploadPromise,
				storedFileName: file.name,
				displayTitle: file.name
			});

			let uploadError = false;

			try {
				await uploadPromise;

				thumbnailFileHandle = await currentProfile.opfsProfileDirectoryHandle.getFileHandle(
					`thumbnail_${file.name}.jpg`,
					{ create: true }
				);

				const thumbnailWritable = await thumbnailFileHandle.createWritable();
				await thumbnailWritable.write(thumbnailBlobData);
				await thumbnailWritable.close();
			} catch (err) {
				uploadError = true;
				if (err.name === 'AbortError') {
					console.log('Upload cancelled');
					showNotificationModal("Dikkat", "Yükleme iptal edildi", "Tamam");
				} else {
					console.error(err);
				}
			} finally {
				activeUploadsGlobal.delete(video.id);
				input.disabled = false;
				videoLabel.style.pointerEvents = "";
				videoLabel.style.opacity = "";
				videoLabel.style.cursor = "";
				// Re-enable poster upload input
				posterUploadInput.disabled = false;
				posterLabel.style.pointerEvents = "";
				posterLabel.style.opacity = "";
				posterLabel.style.cursor = "";
				// Restore clear button text back to "Sil" (Delete)
				clearRowBtn.textContent = "Sil";
				input.value = ""; // allow selecting same file again
			}

			// Only proceed with file reads and UI updates if upload was successful
			if (uploadError) {
				videoIndicator.style.backgroundImage = "none";
				queuedOPFSOperationsCount--;
				// Reset poster and clear button styles since upload failed/was cancelled
				posterUploadInput.disabled = false;
				posterLabel.style.pointerEvents = "";
				posterLabel.style.opacity = "";
				posterLabel.style.cursor = "";
				clearRowBtn.textContent = "Sil";
				return;
			}

			videoIndicator.style.backgroundImage = "none";

			const videoFile = await fileHandle.getFile();
			thumbnailFile = await thumbnailFileHandle.getFile();
			storageInfo();

			video.src = URL.createObjectURL(videoFile);
			video.storedFileName = videoFile.name;
			video.displayTitle = videoFile.name;
			video.size = fileSizeGB.toFixed(2) + " GB";
			if (thumbnailFile) {
				video.poster = URL.createObjectURL(thumbnailFile);
				video.posterTitle = thumbnailFile.name;
				posterIndicator.textContent = emojiMap.checkmark;
			}
			videoIndicator.textContent = emojiMap.checkmark;

			queuedOPFSOperationsCount--;
			if (queuedOPFSOperationsCount < 1) {
				renderSourceSelectors();
			}
			video.originalFileName = "";
			activeUploadsSet.delete(file.name);
			renderVideoList();
			saveState();
		});

		videoForm.appendChild(videoUploadInput);
		videoForm.appendChild(videoLabel);
		if (video.src && video.src !== "") {
			videoIndicator.textContent = emojiMap.checkmark;
		}
		videoForm.appendChild(videoIndicator);

		const posterForm = document.createElement("form");
		posterForm.method = "post";
		posterForm.enctype = "multipart/form-data";
		posterForm.style.width = "116px";

		const posterLabel = document.createElement("label");
		posterLabel.className = "preview upload-input-label";
		posterLabel.htmlFor = `poster_upload_${video.id + 1}`;
		posterLabel.textContent = "Poster Seç";

		const posterIndicator = document.createElement("span");
		posterIndicator.className = "present-or-absent";
		// posterIndicator.textContent = emojiMap.unchecked;

		const posterUploadInput = document.createElement("input");
		posterUploadInput.type = "file";
		posterUploadInput.name = `poster_upload_${video.id + 1}`;
		posterUploadInput.id = `poster_upload_${video.id + 1}`;
		posterUploadInput.className = "poster_upload_input upload-input";
		posterUploadInput.accept = "image/*";
		posterUploadInput.style.display = "none";
		posterUploadInput.addEventListener("change", async (e) => {
			// working here
			const input = e.target;
			const imageFile = input.files ? input.files[0] : null;
			if (!imageFile) {
				alert("Dosya seçilemedi. Lütfen tekrar deneyin.");
				return;
			}

			const imageValidatioObject = await validatePosterImageBeforeOPFS(imageFile);

			if (!imageValidatioObject.supported) {
				alert(imageValidatioObject.reason);
				return;
			}

			if (video.poster && video.poster.startsWith('blob:')) {
				URL.revokeObjectURL(video.poster);
				if (butlerVideosDirectoryHandle && currentProfile.opfsProfileDirectoryHandle && video.posterTitle) {
					currentProfile.opfsProfileDirectoryHandle.removeEntry(video.posterTitle).then(() => {
						storageInfo();
					}).catch(err => {
						console.error("Error removing old poster file from OPFS: ", err);
					});
				}
			}

			try {
				const posterFileHandle = await currentProfile.opfsProfileDirectoryHandle.getFileHandle(video.posterTitle, { create: true });
				const posterWritable = await posterFileHandle.createWritable();
				await posterWritable.write(imageFile);
				await posterWritable.close();

				video.poster = URL.createObjectURL(imageFile);
				posterIndicator.textContent = emojiMap.checkmark;

				saveState();
				renderSourceSelectors();
				renderVideoList();
			} catch (err) {
				console.error("Error saving poster to OPFS: ", err);
				alert("Poster dosyası OPFS'ye kaydedilirken bir hata oluştu. Lütfen tekrar deneyin.");
				return;
			}


			// if (validImageFileType(file)) {
			// 	video.poster = URL.createObjectURL(file);
			// 	posterIndicator.textContent = emojiMap.checked;
			// 	saveState();
			// 	renderSourceSelectors();
			// 	renderVideoList();
			// } else {
			// 	alert("Lütfen geçerli bir resim dosyası seçin.");
			// }
		});

		const clearRowBtn = document.createElement("button");
		clearRowBtn.type = "button";
		clearRowBtn.className = "btn btn-sm btn-warning remove-source-btn settings-btn";
		clearRowBtn.id = `remove-source-${video.id + 1}-btn`;
		clearRowBtn.textContent = "Sil";
		clearRowBtn.addEventListener("click", async () => {
			if (video.originalFileName) {
				activeUploadsSet.delete(video.originalFileName);
				video.originalFileName = "";
				// showNotificationModal("Dikkat", "Yükleme iptal edildi", "Tamam");
				controller.abort()
			}

			const active = activeUploadsGlobal.get(video.id);

			console.log(active);
			if (active) {
				active.controller.abort();
				
				try {
					await active.promise;
				} catch (e) {
					// ignore abort error
				}
				
				activeUploadsSet.delete(active.storedFileName);
				
				activeUploadsGlobal.delete(video.id);
			}

			if (video.src && video.src.startsWith('blob:')) {
				const confirmationMessage = `
					<ul>
						<li>${video.displayTitle}</li>
					</ul>
					adlı video tarayıcı hafızasından kalıcı olarak silinecek. <strong>Bu işlem geri alınamaz.</strong><br><br>Devam etmek istediğinize emin misiniz?
				`;
				const confirmed = await showConfirmModal("Dikkat", confirmationMessage, "Sil");
				if (!confirmed) {
					return;
				}
				URL.revokeObjectURL(video.src);
			}
			// if (video.src && video.src.startsWith('blob:')) {
			// 	URL.revokeObjectURL(video.src);
			// }
			if (video.poster && video.poster.startsWith('blob:')) {
				URL.revokeObjectURL(video.poster);
			}
			if (butlerVideosDirectoryHandle && currentProfile.opfsProfileDirectoryHandle && video.storedFileName) {
			// if (butlerVideosDirectoryHandle && currentProfile.opfsProfileDirectoryHandle) {
				currentProfile.opfsProfileDirectoryHandle.removeEntry(video.storedFileName).then(() => {
					storageInfo();
				}).catch(err => {
					console.error("Error removing video file from OPFS: ", err);
					alert("Videoyu silerken bir hata oluştu");
				});
			}
			if (butlerVideosDirectoryHandle && currentProfile.opfsProfileDirectoryHandle && video.posterTitle) {
				currentProfile.opfsProfileDirectoryHandle.removeEntry(video.posterTitle).then(() => {
				}).catch(err => {
					console.error("Error removing thumbnail file from OPFS: ", err);
					alert("Video posterini silerken bir hata oluştu");
				});
			}
			video.originalFileName = "";
			video.storedFileName = "";
			video.displayTitle = "";
			video.src = "";
			video.poster = "";
			video.posterTitle = "";
			video.alt = "";
			video.currentTime = 0;
			video.size = 0;
			updateVideoList();
			saveState();
			renderSourceSelectors();
			renderVideoList();
		});

		
		posterForm.appendChild(posterUploadInput);
		posterForm.appendChild(posterLabel);
		if (video.poster && video.poster !== "") {
			posterIndicator.textContent = emojiMap.checkmark;
		}
		posterForm.appendChild(posterIndicator);
		
		forms.appendChild(videoForm);
		forms.appendChild(posterForm);
		
		row.appendChild(rowNumber);
		row.appendChild(forms);
		row.appendChild(clearRowBtn);

		const videoTitleAndSizeInfoContainer = document.createElement("div");
		videoTitleAndSizeInfoContainer.className = "video-title-and-size-info-container";
		const videoTitleContainer = document.createElement("div");
		videoTitleContainer.className = "source-selection-section-video-title-container";

		const videoTitleEditingButtonContainer = document.createElement("div");
		videoTitleEditingButtonContainer.className = "video-title-editing-button-container";

		const videoTitle = document.createElement("div");
		videoTitle.className = "source-selection-section-video-title";
		videoTitle.textContent = `${video.displayTitle}` || "";

		if (video.src && video.src !== "") {
			const editTitleBtn = document.createElement("button");
			const saveTitleBtn = document.createElement("button");
			// const titleIsEmpty = !video.displayTitle || video.displayTitle.trim() === "";
			const cancelEditBtn = document.createElement("button");
			const titleIsDefault = video.displayTitle === (video.storedFileName || `Video ${video.id + 1}`);
			const returnToDefaultTitle = document.createElement("button");;
			
			
			
			saveTitleBtn.disabled = true;
			cancelEditBtn.disabled = true;

			editTitleBtn.type = "button";
			editTitleBtn.className = "btn btn-sm btn-secondary edit-title-btn settings-btn";
			editTitleBtn.id = `${state.currentProfileId}-edit-title-${video.id + 1}-btn`;
			editTitleBtn.textContent = "Düzenle";
			

			saveTitleBtn.type = "button";
			saveTitleBtn.className = "btn btn-sm btn-secondary save-title-btn settings-btn";
			saveTitleBtn.id = `${state.currentProfileId}-save-title-${video.id + 1}-btn`;
			saveTitleBtn.textContent = "Kaydet";
			

			videoTitleEditingButtonContainer.appendChild(editTitleBtn);
			videoTitleEditingButtonContainer.appendChild(saveTitleBtn);
			videoTitleEditingButtonContainer.appendChild(cancelEditBtn);
			videoTitleEditingButtonContainer.appendChild(returnToDefaultTitle);

			editTitleBtn.addEventListener("click", () => {
				videoTitle.contentEditable = true;
				videoTitle.focus();
				videoTitle.classList.add("editing");
				editTitleBtn.disabled = true;
				saveTitleBtn.disabled = false;
				cancelEditBtn.disabled = false;
				// Move cursor to end of text
				// select text content				
				const range = document.createRange();
				range.selectNodeContents(videoTitle);
				const sel = window.getSelection();
				sel.removeAllRanges();
				sel.addRange(range);
				// document.getSelection().collapseToEnd();
			});

			saveTitleBtn.addEventListener("click", () => {
				const newTitle = videoTitle.textContent.trim();
				video.displayTitle = newTitle;
				saveTitleBtn.disabled = true;
				editTitleBtn.disabled = false;
				videoTitle.contentEditable = false;
				videoTitle.classList.remove("editing");
				cancelEditBtn.disabled = true;
				saveState();
				updateVideoList();
				renderSourceSelectors();
				renderVideoList();
			});

			cancelEditBtn.type = "button";
			cancelEditBtn.className = "btn btn-sm btn-secondary cancel-edit-btn settings-btn";
			cancelEditBtn.id = `${state.currentProfileId}-cancel-edit-title-${video.id + 1}-btn`;
			cancelEditBtn.textContent = "İptal";
			cancelEditBtn.addEventListener("click", () => {
				videoTitle.textContent = video.displayTitle;
				saveTitleBtn.disabled = true;
				editTitleBtn.disabled = false;
				videoTitle.contentEditable = false;
				videoTitle.classList.remove("editing");
				cancelEditBtn.disabled = true;
			});

			returnToDefaultTitle.type = "button";
			returnToDefaultTitle.className = "btn btn-sm btn-secondary return-to-default-title-btn settings-btn";
			returnToDefaultTitle.id = `${state.currentProfileId}-return-to-default-title-${video.id + 1}-btn`;
			returnToDefaultTitle.textContent = "Varsayılan";
			if (titleIsDefault) {
				returnToDefaultTitle.disabled = true;
			}

			returnToDefaultTitle.addEventListener("click", () => {
				video.displayTitle = video.storedFileName || `Video ${video.id + 1}`;
				videoTitle.textContent = video.displayTitle;
				saveState();
				updateVideoList();
				renderSourceSelectors();
				renderVideoList();
			});
		}

		const videoSizeContainer = document.createElement("div");
		videoSizeContainer.className = "video-size-container";
		videoSizeContainer.textContent = "Dosya Boyutu: ";
		const videoSize = document.createElement("span");
		videoSize.className = "video-size";
		videoSize.textContent = video.size ? `${video.size}` : "";
		
		videoSizeContainer.appendChild(videoSize);
		rowContainer.appendChild(row);
		videoTitleAndSizeInfoContainer.appendChild(videoSizeContainer);
		videoTitleAndSizeInfoContainer.appendChild(videoTitle);

		if (videoTitle.textContent === "") {
			videoTitleAndSizeInfoContainer.classList.add("video-display-title-empty");
		} else {
			videoTitleAndSizeInfoContainer.classList.remove("video-display-title-empty");
		}

		videoTitleContainer.appendChild(videoTitleAndSizeInfoContainer);
		videoTitleContainer.appendChild(videoTitleEditingButtonContainer);
		if (video.src && video.src !== "") {
			rowContainer.appendChild(videoTitleContainer);
		}
		
		sourceSelectorSection.appendChild(rowContainer);
	}
}

function createDefaultVideoList() {
	const currentProfile = state.profiles.find(p => p.id === state.currentProfileId);
	currentProfile.videos = [];
	for (let i = 0; i < currentProfile.videoCount; i++) {
		currentProfile.videos[i] = {
			id: i,
			storedFileName: "",
			src: "",
			poster: "",
			posterTitle: "",
			alt: "",
			currentTime: 0,
			size: 0,
		};
	}
}

function updateVideoList() {
	const currentProfile = state.profiles.find(p => p.id === state.currentProfileId);
	const videoCount = currentProfile.videoCount || 1;
	const existing = Array.isArray(currentProfile.videos) ? currentProfile.videos.slice() : [];

	// Build a stable list where each index matches the video's `id`.
	// This preserves slots so clearing one row doesn't shift/remove subsequent videos.
	const newList = [];
	for (let i = 0; i < videoCount; i++) {
		const found = existing.find(v => v && v.id === i);
		if (found) {
			found.id = i; // normalize id
			newList[i] = Object.assign({}, found);
		} else {
			newList[i] = {
				id: i,
				storedFileName: "",
				displayTitle: "",
				src: "",
				poster: "",
				posterTitle: "",
				alt: "",
				currentTime: 0,
				size: 0,
			};
		}
	}

	currentProfile.videos = newList;
	localStorage.setItem("videos", JSON.stringify(currentProfile.videos));
}

// window.addEventListener("orientationchange", function() {
// 	fitThumbnailsInViewport();
// }, false);

window.addEventListener('resize', () => fitThumbnailsInViewport(state.profiles.find(p => p.id === state.currentProfileId).videoCount));

async function renderVideoList() {
	const currentProfile = state.profiles.find(p => p.id === state.currentProfileId);
	videoListGrid.innerHTML = "";
	videoListGrid.className = `video-list-grid count-${currentProfile.videoCount}`;
	
	for (const video of currentProfile.videos) {
		const videoListItem = document.createElement("div");
		videoListItem.className = "video-list-item";
		const img = document.createElement("img");
		img.className = "thumbnail video-poster-img";
		img.alt = video.alt || video.storedFileName || `Video ${video.id + 1}`;
		// Always add an <img> so DOM indices match `state.profiles[].videos` indexes.
		// Show poster if present. Show placeholder only when there is a video but no poster.
		// Hide the <img> entirely for empty slots (no video).
		if (video.poster && video.poster !== "") {
			img.src = video.poster;
			img.style.display = '';
		} else if (video.src && video.src !== "") {
			img.src = "./img/placeholder.svg"; // existing video but poster missing
			img.style.display = '';
		} else {
			img.src = '';
			img.style.display = 'none';
		}
		videoListItem.appendChild(img);

		if (!DEBUGGING && img.getAttribute("src") !== "") {
			videoListItem.addEventListener("contextmenu", (e) => {
				console.log("Context menu disabled on video thumbnail.");
				e.preventDefault();
				return false;
			});
			videoListItem.addEventListener("dragstart", (e) => {
				console.log("Drag and drop disabled on video thumbnail.");
				e.preventDefault();
				return false;
			});
		}

		if (!video.src || video.src === "") {
			videoListItem.style.backgroundColor = "#333";
		}

		if (video.src && video.src !== "") {
			const overlay = document.createElement("div");
			overlay.className = "video-title-overlay";
			if (video.displayTitle && video.displayTitle !== "") {
				// overlay.textContent = video.displayTitle.length < 26 ? video.displayTitle : `${video.displayTitle.slice(0, 26)}...`;
				overlay.textContent = video.displayTitle;
			} else {
				// overlay.textContent = `Video ${video.id + 1}`;
				overlay.textContent = "";
			}
		
			videoListItem.appendChild(overlay);
			if (state.uiSettings.showOverlays && video.displayTitle && video.displayTitle !== "") {
				overlay.style.display = 'block';
			} else {
				overlay.style.display = 'none';
			}
		} else {
			const emptyText = document.createElement("div");
			emptyText.className = "empty-slot-text";
			emptyText.textContent = `Video ${video.id + 1}: (Video yok)`;
			videoListItem.appendChild(emptyText);
		}

		videoListItem.addEventListener("click", async () => {
			if (!video.src || video.src === "") {
				return;
			}
			const playerContainer = document.getElementById('vp');
			// playerContainer.dataset.videoId = video.id;
			const videoUrl = video.src;
			// console.log("Playing video URL:", videoUrl);
			// 1. Show player
    		playerContainer.style.display = 'block';
			vp.src({ src: videoUrl, type: 'video/mp4'});
			openFullscreen(vp);
			state.currentlyPlayingVideoId = video.id;
			vp.volume(state.player_settings.playbackSettings.rememberVolumeLevel ? state.currentVolume : 0.8);
			saveState();
			vp.play();
		});
		videoListGrid.appendChild(videoListItem);
	}
	const videoPosterImages = document.querySelectorAll(".video-poster-img");
	for (const [i, video] of currentProfile.videos.entries()) {
		const imgEl = videoPosterImages[i];
		// if DOM <img> for this slot doesn't exist, skip safely
		if (!imgEl) continue;

		if (video.src && video.src !== "") {
			if (video.poster && video.poster !== "" && video.posterTitle) {
				const profileDirectoryHandle = currentProfile.opfsProfileDirectoryHandle;
				if (!profileDirectoryHandle || typeof profileDirectoryHandle !== 'object') {
					imgEl.src = "./img/placeholder.svg";
					imgEl.style.display = '';
					continue;
				}
				try {
					const thumbnailHandle = await profileDirectoryHandle.getFileHandle(video.posterTitle);
					if (thumbnailHandle) {
						thumbnailHandle.getFile().then(f => {
							const thumbnailUrl = URL.createObjectURL(f);
							imgEl.src = thumbnailUrl;
							imgEl.style.display = '';
							video.poster = thumbnailUrl;
							video.posterTitle = thumbnailHandle.name;
							// console.log(`Set thumbnail for ${video.storedFileName} in profile ${currentProfile.displayName}: `, thumbnailUrl);
						}).catch(err => {
							console.error("Error loading thumbnail from OPFS: ", err);
							imgEl.src = "./img/placeholder.svg";
							imgEl.style.display = '';
						});
					}
				} catch (err) {
					console.error("Thumbnail handle not found:", err);
					imgEl.src = "./img/placeholder.svg";
					imgEl.style.display = '';
				}
			} else {
				// video exists but no poster — show placeholder
				imgEl.src = "./img/placeholder.svg";
				imgEl.style.display = '';
			}
		} else {
			// empty slot — hide image element entirely
			imgEl.src = '';
			imgEl.style.display = 'none';
		}
	}

	fitThumbnailsInViewport(currentProfile.videos.length);
}

function generateThumbnail(videoSrc) {
	return new Promise((resolve, reject) => {
		const video = document.createElement('video');
		
		video.src = videoSrc;
		video.crossOrigin = "anonymous";
		video.addEventListener('loadeddata', () => {
			video.currentTime = state.player_settings.THUMBNAIL_GENERATION_TIME; // Capture thumbnail at nth second
		});
		
		try {
			video.addEventListener('seeked', () => {
				if (!video.videoWidth || !video.videoHeight) {
					return reject(new Error("Video metadata not loaded properly, cannot generate thumbnail."));
				}
				const canvas = document.createElement('canvas');
				canvas.width = video.videoWidth;
				canvas.height = video.videoHeight;
				const ctx = canvas.getContext('2d');
				ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
				canvas.toBlob(blob => {
					const thumbnailUrl = URL.createObjectURL(blob);
					resolve(thumbnailUrl);
				}, 'image/jpeg');
			});
		} catch (err) {
			console.error("Error during thumbnail generation: ", err);
			reject(err);
		}
		video.addEventListener('error', (e) => {
			reject(e);
		});
	});
}

function fitThumbnailsInViewport(videoCount) {
	const vw = window.innerWidth;
	const vh = window.innerHeight;

	const isPortrait = vh > vw;

	let cols, rows;
	switch (videoCount) {
		case 1:
			cols = 1;
			rows = 1;
			break;
		case 2:
			if (isPortrait) {
				cols = 1;
				rows = 2;
			} else {
				cols = 2;
				rows = 1;
			}
			break;
		case 4:
			if (isPortrait) {
				cols = 1;
				rows = 4;
			} else {
				cols = 2;
				rows = 2;
			}
			break;
		default:
			cols = videoCount;
			rows = 1;
	}


	const maxWidth = vw / cols;
	const maxHeight = vh / rows;

	// Fit 16:9 inside the available cell
	let width = maxWidth - 8;
	let height = width * 9 / 16 - 8;
	if (height > maxHeight) {
		height = maxHeight - 8;
		width = height * 16 / 9;
	}

	// debug info start
	// console.log("window.innerWidth / window.innerHeight: ", window.innerWidth / window.innerHeight);
	// console.log(`Calculated thumbnail size: ${width}x${height}`);
	// console.log(`Grid layout: ${cols} columns x ${rows} rows`);
	// console.log(`Max cell size: ${maxWidth}x${maxHeight}`);
	// console.log(isPortrait ? "Portrait orientation" : "Landscape orientation");
	// console.log(`Window size: ${vw}x${vh}`);
	// debug info end

	document.querySelectorAll('.video-list-item').forEach(el => {
		el.style.width = `${width}px`;
		el.style.height = `${height}px`;
	});
}

async function clearDirectoryContents(dirHandle) {
    for await (const entry of dirHandle.values()) {
        if (entry.kind === 'file') {
            await dirHandle.removeEntry(entry.name);
        } else if (entry.kind === 'directory') {
            await clearDirectoryContents(entry); // Recursively clear contents
            await dirHandle.removeEntry(entry.name); // Remove the subdirectory if desired
        }
    }
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

// console.log(isMobileDevice());


// pb.addEventListener("click", () => {
// 	vp.src({ src: "../videos/ed_1024_512kb.mp4" });
// 	launchIntoFullscreen(vp.el());
// 	vp.play();
// })

// // Find the right method, call on correct element
// function launchIntoFullscreen(element) {
//   if(element.requestFullscreen) {
//     element.requestFullscreen({navigationUI: 'hide'});
//   } else if(element.mozRequestFullScreen) {
//     element.mozRequestFullScreen({navigationUI: 'hide'});
//   } else if(element.webkitRequestFullscreen) {
//     element.webkitRequestFullscreen({navigationUI: 'hide'});
//   } else if(element.msRequestFullscreen) {
//     element.msRequestFullscreen({navigationUI: 'hide'});
//   }
// }

function initSettingsPanelInputs() {
	settingsCheckBoxes.forEach(checkbox => {
		const datasetKey = checkbox.dataset.key;
		switch(datasetKey) {
			case "showVideoControls":
				state.player_settings.showVideoControls 
					? checkbox.checked = true
					: checkbox.checked = false; 
				break;
			case "rememberVolumeLevel":
				state.player_settings.playbackSettings.rememberVolumeLevel
					? checkbox.checked = true
					: checkbox.checked = false; 
				break;
			case "rememberVideoTime":
				state.player_settings.playbackSettings.rememberVideoTime
					? checkbox.checked = true
					: checkbox.checked = false; 
				break;
			case "showVideoTitles":
				state.uiSettings.showOverlays
					? checkbox.checked = true
					: checkbox.checked = false; 
				break;
			case "time":
				(state.player_settings.controlBarChildrenState.duration&&
				state.player_settings.controlBarChildrenState.timeDivider &&
				state.player_settings.controlBarChildrenState.time)
					? checkbox.checked = true
					: checkbox.checked = false; 
				break;
			case "touchControlsEnabled":
				state.player_settings.playbackSettings.touchControlsEnabled
					? checkbox.checked = true
					: checkbox.checked = false;
				break;
			default:
				state.player_settings.controlBarChildrenState[datasetKey]
					? checkbox.checked = true
					: checkbox.checked = false; 
				break;
		}
	});
}

function updateOverlayDisplay() {
	const videoListGrid = document.getElementById('video-players');
	videoListGrid.querySelectorAll('.video-title-overlay').forEach(overlay => {

		if (state.uiSettings.showOverlays) {
			if (overlay.textContent && overlay.textContent.trim() !== "") {
				overlay.style.display = 'block';
			} else {
				overlay.style.display = 'none';
			}
		} else {
			overlay.style.display = 'none';
		}
	});	
}

function initPlayer(touchEnabled) {
	if (vp) {
		vp.dispose();
	}

	  // Remove old video element if still present
	const oldVideo = document.getElementById("vp");
	if (oldVideo) {
		oldVideo.remove();
	}

	const videoEl = document.createElement("video");
	videoEl.id = "vp";
	videoEl.className = "video-js vjs-default-skin";
	videoEl.innerHTML = `
		<p class="vjs-no-js vjs-fluid">
          To view this video please enable JavaScript, and consider upgrading to a
          web browser that
          <a href="https://videojs.com/html5-video-support/" target="_blank">
            supports HTML5 video
          </a>
        </p>
	`;
	videoListGrid.insertAdjacentElement("afterend", videoEl);

	vp = videojs(videoEl, {
		controls: true,
		fluid: true,
		autoplay: false,
		preload: 'auto',
		loadingSpinner: true,
		// userActions: {
		// 	hotkeys: true,
		//  click: false,
		//  click: myClickHandler,
		//  doubleClick: myDoubleClickHandler
		// },
		playbackRates: [], // ← disables PlaybackRateMenuButton entirely
		controlBar: {
			pictureInPictureToggle: false, // ← disables PiP completely
			remainingTimeDisplay: false, // ← disables just the current time text
			// VolumePanel: {
			// 	inline: false
			// },
			// children: [
			// 	'PlayToggle',
			// 	'ProgressControl',
			// 	// 'TimeDisplay',
			// 	// 'CurrentTimeDisplay',
			// 	// 'TimeDivider',
			// 	// 'DurationDisplay',
			// 	// 'RemainingTimeDisplay',
			// 	'VolumePanel',
			// 	'FullscreenToggle',
			// 	// 'PlayToggle',
			// 	// 'ProgressControl',
			// 	// 'TimeDisplay',           // ← THIS is the correct component
			// 	// 'RemainingTimeDisplay',  // optional
			// 	// 'VolumePanel',
			// 	// 'FullscreenToggle',
			// ],
			// skipButtons: {
			// 	forward: 5
			// },
		},
		// userActions: {
		// 	hotkeys: function(event) {
		// 		// `this` is the player in this context

		// 		// `x` key = pause
		// 		if (event.which === 88) {
		// 			this.pause();
		// 		}
		// 		// `y` key = play
		// 		if (event.which === 89) {
		// 			this.play();
		// 		}
		// 	}
		// },
		plugins: {
			hotkeys: {
				volumeStep: 0.05,
				seekStep: 5,
				// enableModifiersForNumbers: false,
				// enableFullscreen: false,
				// enableMute: true,
			},
		},
	});

	vp.mobileUi({
		fullscreen: {
			enterOnRotate: true,
			exitOnRotate: false,
			lockOnRotate: false,
			lockToLandscapeOnEnter: false,
			disabled: false,
		},
		touchControls: {
			seekSeconds: 10,
			tapTimeout: 300,
			disableOnEnd: false,
			disabled: !touchEnabled,
		},
		forceForTesting: true,
	});

	applyVideoControlBarState();
}

function setTouchControls(enabled) {
  if (enabled) {
    vp.addClass('vjs-mobile-ui');
  } else {
    vp.removeClass('vjs-mobile-ui');
  }
}

function rebuildMobileUi(enabled) {
	if (vp.mobileUi) {
	// remove existing mobile UI listeners
		vp.mobileUi()?.dispose?.();
	}

	vp.mobileUi({
		fullscreen: {
			enterOnRotate: true,
			exitOnRotate: false,
			lockOnRotate: false,
			lockToLandscapeOnEnter: false,
			disabled: false,
		},
		touchControls: {
			seekSeconds: 10,	
			tapTimeout: 300,
			disableOnEnd: false,
			disabled: !enabled
		},
		forceForTesting: true,
	});
}

function applyVideoControlBarState() {
  const controlBar = vp.getChild('ControlBar');

  const controls = {
    play: controlBar.getChild('PlayToggle'),
    progress: controlBar.getChild('ProgressControl'),
    volume: controlBar.getChild('VolumePanel'),
	time: controlBar.getChild('CurrentTimeDisplay'),
	timeDivider: controlBar.getChild('TimeDivider'),
	duration: controlBar.getChild('DurationDisplay'),
	// remaining: controlBar.getChild('RemainingTimeDisplay'),
    // rate: controlBar.getChild('PlaybackRateMenuButton'),
    // pip: controlBar.getChild('PictureInPictureToggle'),
    fullscreen: controlBar.getChild('FullscreenToggle'),
  };

  for (const [key, control] of Object.entries(controls)) {
    if (control) {	
		state.player_settings.controlBarChildrenState[key]
			? control.show()
			: control.hide();
    }
  }
//   controls.volume.inline = false;
}

function applyUiSettings() {
	updateOverlayDisplay();
	applyVideoControlBarState();
}


/* View in fullscreen */
async function openFullscreen(player) {
	const currentProfile = state.profiles.find(p => p.id === state.currentProfileId);
	try {
		if (player.requestFullscreen) {
			await player.requestFullscreen({navigationUI: 'hide'});
		} else if (player.webkitRequestFullscreen) { /* Safari */
			await player.webkitRequestFullscreen({navigationUI: 'hide'});
		} else if (player.msRequestFullscreen) { /* IE11 */
			await player.msRequestFullscreen({navigationUI: 'hide'});
		}
		player.currentTime(
			currentProfile.videos[state.currentlyPlayingVideoId].currentTime || 
			0);
		player.volume(state.currentVolume);
		await player.play();
	} catch (err) {
		console.error("Error attempting to enable fullscreen mode or playback:", err);
	}

	const cleanupVideoPlayback = () => {
		const vpElement = document.getElementById('vp');
		vp.volume(state.currentVolume);
		vp.pause();
	
		vp.currentTime(0);
		currentProfile.videos[state.currentlyPlayingVideoId].currentTime = 0;
		vpElement.dataset.videoId = "";
		saveState();
		vpElement.style.display = 'none';
		
		// URL.revokeObjectURL(vp.src());
		document.removeEventListener('fullscreenchange', onFullscreenChange);
	};

	// When video exits before ending, hide the player again but don't reset time
	const cleanup = () => {
		const vpElement = document.getElementById('vp');
		vp.pause();
		state.currentVolume = vp.volume();
		currentProfile.videos[state.currentlyPlayingVideoId].currentTime = state.player_settings.playbackSettings.rememberVideoTime ? vp.currentTime() : 0;
		state.currentlyPlayingVideoId = null;
		saveState();

		vpElement.style.display = 'none';
		
		// URL.revokeObjectURL(vp.src());
		document.removeEventListener('fullscreenchange', onFullscreenChange);
	};

	function onFullscreenChange() {
		if (!document.fullscreenElement) {
			cleanup();
		}
	}

	vp.one('ended', cleanupVideoPlayback);
	document.addEventListener('fullscreenchange', onFullscreenChange);
}

/* Close fullscreen */
function closeFullscreen() {
	if (document.exitFullscreen) {
		document.exitFullscreen();
	} else if (document.webkitExitFullscreen) { /* Safari */
		document.webkitExitFullscreen();
	} else if (document.msExitFullscreen) { /* IE11 */
		document.msExitFullscreen();
	}
}

function storageInfo() {
	navigator.storage.estimate().then(({quota, usage}) => {
		OPFSDiskUsage.textContent = `DİSK: Kullanılan ${(usage / 1073741824).toFixed(2)} GB; Kalan ${((quota - usage) / 1073741824).toFixed(2)} GB; Kota ${(quota / 1073741824).toFixed(2)} GB`;
	});
}

function storageInfoDebug() {
	navigator.storage.estimate().then(({quota, usage}) => {
		console.log(`Quota: ${(quota / 1073741824).toFixed(2)} GB - Usage: ${(usage / 1073741824).toFixed(2)} GB`);
	});
}

async function cleanZeroByteFilesFromDirectory(directoryHandle) {
	for await (let handle of directoryHandle.values()) {
		if (handle.kind === "file") {
			const f = await handle.getFile(handle.name);
			if (f.size === 0) {
				directoryHandle.removeEntry(f.name);
			}
		}
	}
}

window.storageInfoDebug = storageInfoDebug;

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


// try {
//   if (!canPlayByMime(file)) throw 'mime';

//   await probeVideoMetadata(file);
//   await testPlayback(file);

//   // ✅ safe to store in OPFS
//   await saveToOPFS(file);

// } catch (e) {
//   console.warn("Rejected video:", e);
// }


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

async function copyToOPFSWithCancel(file, fileHandle, signal) {
  const writable = await fileHandle.createWritable();

  try {
    await file.stream().pipeTo(writable, { signal });
  } catch (err) {
    await writable.abort();
	await fileHandle.remove().catch(() => {});
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
