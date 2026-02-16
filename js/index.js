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
const videoListGrid = document.querySelector(".video-list-grid");
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

const OPFSDiskUsage = document.getElementById("opfs-disk-usage");

const THUMBNAIL_GENERATION_TIME = 10; // seconds

// const vpElement = document.getElementById("vp");

let vp; // Video.js player instance

const emojiMap = {
	checked: "✅",
	unchecked: "❌",
	checkmark: "✔️",
	lightCheckmark: "✔️",
	absent: "❎",
	present: "✅",
};

// Video Upload Elements
const videoUploadInputs = document.querySelectorAll(".video_upload_input");
const posterUploadInputs = document.querySelectorAll(".poster_upload_input");
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
					name: "Varsayılan",
					opfsProfileDirectoryHandle: "",
					videoCount: 1,
					videos: [
						{
							id: 0,
							title: "",
							src: "",
							poster: "",
							posterTitle: "",
							alt: "",
							currentTime: 0,
						}
					]
				}
			],
	get profileNames() {
		return this.profiles.map(p => p.name);
	},
	currentProfileId: localStorage.getItem("currentProfileId") ?
		JSON.parse(localStorage.getItem("currentProfileId")) :
		0,
	currentlyPlayingVideoId: null,
	currentVolume: localStorage.getItem("currentVolume") ? 
		JSON.parse(localStorage.getItem("currentVolume")) :
		1,
}

/* Check for File System Access API */
const supportsFS = 'showOpenFilePicker' in window;
/* Check for OPFS support */
const supportsOPFS = 'storage' in navigator && 'getDirectory' in navigator.storage;
// console.log("File System Access API supported: ", supportsFS);
// console.log("OPFS supported: ", supportsOPFS);
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
		const opfsProfileDirectoryHandle  = await butlerVideosDirectoryHandle.getDirectoryHandle(profile.name, {create: true});
		profile.opfsProfileDirectoryHandle = opfsProfileDirectoryHandle;
		for (video of profile.videos) {
			if (video.title !== "") {
				// console.log(`Getting video handle for ${video.title} in profile ${profile.name}`);
				try {
					const opfsVideoHandle = await opfsProfileDirectoryHandle.getFileHandle(video.title);
					// console.log(`Got video handle for ${video.title} in profile ${profile.name}: `, opfsVideoHandle);
					try {
						const opfsVideoFile = await opfsVideoHandle.getFile();
						video.src = URL.createObjectURL(opfsVideoFile);
						// console.log(`Created object URL for ${video.title} in profile ${profile.name}: `, video.src);
					} catch (err) {
						console.error("Could not create object URL from file handle:", err);
					}
				} catch (error) {
					console.error("Could not get video handle: ", error);
				}
			}
			if (video.posterTitle !== "") {
				// console.log(`Video ${video.title} in profile ${profile.name} has a poster: ${video.poster}`);
				try {
					const thumbnailHandle = await opfsProfileDirectoryHandle.getFileHandle(video.posterTitle);
					// console.log(`Got thumbnail handle for ${video.title} in profile ${profile.name}: `, thumbnailHandle);
					try {
						const opfsThumbnailFile = await thumbnailHandle.getFile();
						video.poster = URL.createObjectURL(opfsThumbnailFile);
						video.posterTitle = thumbnailHandle.name;
						// console.log(video.poster);
						// console.log(`Created object URL for thumbnail of ${video.title} in profile ${profile.name}: `, video.poster);
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
    // console.log(`File read from OPFS: ${file.name}, size: ${file.size} bytes, type: ${file.type}`);
	// console.log(`Thumbnail file read from OPFS: ${thumbnailFile.name}, size: ${thumbnailFile.size} bytes, type: ${thumbnailFile.type}`);
    const url = URL.createObjectURL(file);
	const thumbnailUrl = URL.createObjectURL(thumbnailFile);
    vp.src = url;
	vp.poster = thumbnailUrl;
}

function saveState() {
  localStorage.setItem("profiles", JSON.stringify(state.profiles));
  localStorage.setItem("currentProfileId", state.currentProfileId);
  localStorage.setItem("currentVolume", state.currentVolume);
}

/* Confirmation Modal Utility */
function showConfirmModal(title, message) {
	return new Promise((resolve) => {
		const overlay = document.getElementById("confirm-modal-overlay");
		const titleEl = document.getElementById("confirm-modal-title");
		const messageEl = document.getElementById("confirm-modal-message");
		const okBtn = document.getElementById("confirm-modal-ok-btn");
		const cancelBtn = document.getElementById("confirm-modal-cancel-btn");

		titleEl.textContent = title;
		messageEl.innerHTML = message;

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
		// console.log("Modal is showed");
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
	if (state.profileNames.includes(profileNameInput.value.trim())) {
		if (profileListContainer.querySelector("#duplicate-profile-alert")) {
			return;
		}
		const alertDiv = document.createElement("div");
		alertDiv.className = "alert alert-warning";
		alertDiv.role = "alert";
		alertDiv.id = "duplicate-profile-alert";
		alertDiv.textContent = "Bu isimde zaten bir profil var. Lütfen farklı bir isim girin.";
		// console.log(addProfileSection);
		addProfileSection.appendChild(alertDiv);
		setTimeout(() => {
			if (addProfileSection.contains(alertDiv)) {
				addProfileSection.removeChild(alertDiv);
			}
		}, 3000);	
		return;
	}
	const newProfile = {
		id: state.profiles.length,
		name: `${profileNameInput.value !== "" ? profileNameInput.value : `Profil ${state.profiles.length}`}`,
		opfsProfileDirectoryHandle: await butlerVideosDirectoryHandle.getDirectoryHandle(`${profileNameInput.value !== "" ? profileNameInput.value : `Profil ${state.profiles.length}`}`, {create: true}),
		videoCount: 1,
		videos: [
			{
				id: 0,
				title: "",
				src: "",
				poster: "",
				posterTitle: "",
				alt: "",
				currentTime: 0,
			}
		]
	};
	state.profiles.push(newProfile);
	state.currentProfileId = newProfile.id;
	saveState();
	renderProfileSelectList();
	renderProfileList();
	renderSourceSelectors();
	renderVideoCountSelector();
});

removeProfileBtn.addEventListener("click", async () => {
	const checkboxes = profileListContainer.querySelectorAll("input[type='checkbox']:checked");
	const idsToRemove = Array.from(checkboxes).map(checkbox => parseInt(checkbox.value)).filter(id => id !== 0 && state.profileNames[id] !== "Varsayılan");
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
				<strong>${profile.name}</strong> profilinde <strong>${profile.videos.filter(video => video.src && video.src !== "").length} adet video</strong> var:<br>
				<ul>
				${profile.videos.filter(video => video.src && video.src !== "").map(video => `<li>${video.title}</li>`).join("")}
				</ul>
				Bu profili silmek, bu videoların tarayıcı hafızasından kalıcı olarak silinmesine neden olacak. <strong>Bu işlem geri alınamaz.</strong><br><br>Devam etmek istediğinize emin misiniz?
			`;
			const confirmed = await showConfirmModal("Dikkat", confirmationMessage);
			console.log(confirmed);
			if (!confirmed) {
				const idx = idsToRemove.indexOf(profile.id);
				if (idx !== -1) idsToRemove.splice(idx, 1);
				console.log(idsToRemove);
				continue;
			}

			// user confirmed -> revoke object URLs and remove OPFS directory
			for (const video of profile.videos) {
				if (video.src && video.src !== "") URL.revokeObjectURL(video.src);
				if (video.poster && video.poster !== "") URL.revokeObjectURL(video.poster);
			}

			if (butlerVideosDirectoryHandle && profile.opfsProfileDirectoryHandle) {
				await butlerVideosDirectoryHandle.removeEntry(profile.opfsProfileDirectoryHandle.name, { recursive: true }).catch(() => {});
			}
		}
	}
	storageInfo();
	state.profiles = state.profiles.filter(profile => !idsToRemove.includes(profile.id));
	if (state.currentProfileId >= state.profiles.length) {
		state.currentProfileId = 0;
	}
	saveState();
	renderProfileSelectList();
	renderProfileList();
	renderVideoCountSelector();
	renderSourceSelectors()
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

	const confirmed = await showConfirmModal("Dikkat", confirmationMessage);

	if (!confirmed) {
		return;
	} else {
		(async () => {
			
			const profilesToRemove = state.profiles.filter(profile => profile.id !== 0 || state.profileNames[profile.id] !== "Varsayılan");
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
				}
			}
		})();
		state.profiles = state.profiles.filter(profile => profile.id === 0 || state.profileNames[profile.id] === "Varsayılan");
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
		userActions: {
			hotkeys: true,
		},
		controlBar: {
			VolumePanel: {
				inline: false
			},
			children: [
				'PlayToggle',
				'ProgressControl',
				'VolumePanel',
				'FullscreenToggle',
			],
		},
	});
	vp.mobileUi({
		fullscreen: {
			enterOnRotate: true,
			exitOnRotate: false,
			lockOnRotate: false,
			lockToLandscapeOnEnter: false,
			disabled: false
		},
		touchControls: {
			seekSeconds: 10,
			tapTimeout: 300,
			disableOnEnd: false,
			disabled: false,
		}
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
		vp.volume(state.currentVolume);
		document.getElementById('vp').style.display = 'none';
	});



	videoCountSelector.value = state.videoCount;
	if (state.profiles[state.currentProfileId].videos.length === 0 || state.profiles[state.currentProfileId].videos.length !== state.profiles[state.currentProfileId].videos.videoCount) {
		updateVideoList();
	}
	videoCountSelector.addEventListener("change", async (e) => {
		const count = parseInt(e.target.value);
		if (!videoCountValues.includes(count)) return;

		const currentProfile = state.profiles[state.currentProfileId];
		const oldCount = currentProfile.videoCount || 1;
		if (count === oldCount) return;

		// Decreasing count -> compact and possibly delete overflow videos
		if (count < oldCount) {
			// Collect videos that actually have a source (preserve order)
			const videosWithSource = currentProfile.videos.filter(v => v && v.src && v.src !== "");
			const toKeep = videosWithSource.slice(0, count);
			const toDelete = videosWithSource.slice(count);

			if (toDelete.length > 0) {
				const names = toDelete.map(v => v.title || `Slot ${v.id + 1}`).join('<br>');
				const prefix1 = oldCount === 2 ? "den" : "ten";
				const prefix2 = count === 1 ? "e" : "ye";
				const message = `
					<strong>Video sayısını ${oldCount}'${prefix1} ${count}'${prefix2} değiştirmek istiyorsunuz.</strong><br><br>
					<strong>${toDelete.length} video tarayıcı hafızasından kalıcı olarak silinecek:</strong><br>
					<ul>
						${names.split('<br>').map(n => `<li>${n}</li>`).join('')}
					</ul>
				`;
				const confirmed = await showConfirmModal("Dikkat", message);
				
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
					newVideos.push({ id: i, title: "", src: "", poster: "", posterTitle: "", alt: "", currentTime: 0 });
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
			currentProfile.videos[i] = { id: i, title: "", src: "", poster: "", posterTitle: "", alt: "", currentTime: 0 };
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
		option.textContent = profile.name;
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
			if (checkbox.id === 0 || checkbox.value === "0" || state.profileNames[checkbox.value] === "Varsayılan") {
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

	for (const [id, profile] of state.profileNames.entries()) {
		const li = document.createElement("li");
		li.className = "profile-list-item";

		const checkBox = document.createElement("input");
		checkBox.className = "form-check-input";
		checkBox.type = "checkbox";
		checkBox.name = `profile_${id}_select`;
		checkBox.id = `profile_${id}_select`;
		checkBox.value = id;

		if (id === 0 || profile === "Varsayılan") {
			checkBox.disabled = true;
		}

		const label = document.createElement("label");
		label.className = "form-check-label";
		label.htmlFor = `profile_${id}_select`;
		label.textContent = profile;

		li.appendChild(checkBox);
		li.appendChild(label);

		profileListContainer.appendChild(li);
	}
}

function renderVideoCountSelector() {
	videoCountSelector.innerHTML = "";
	for (const count of videoCountValues) {
		const option = document.createElement("option");
		option.value = count;
		option.textContent = `${count} Video`;
		if (count === state.profiles[state.currentProfileId].videoCount) {
			option.selected = true;
		} else if (state.profiles[state.currentProfileId].videoCount === undefined && count === 1) {
			option.selected = true;
		}
		videoCountSelector.appendChild(option);
	}
};

function renderSourceSelectors() {
	const currentProfile = state.profiles[state.currentProfileId];
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
				<strong>${currentProfile.name}</strong> profilindeki <strong>bütün videolar</strong> tarayıcı hafızasından kalıcı olarak silinecek:<br>
				<ul>
					${currentProfile.videos.filter(video => video.src && video.src !== "").map(video => `<li>${video.title}</li>`).join('')}
				</ul>
				Bu işlem geri alınamaz.<br><br>Devam etmek istediğinize emin misiniz?
			`;
			const confirmed = await showConfirmModal("Dikkat", message);
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
			video.title = "";
			video.poster = "";
			video.posterTitle = "";
			video.alt = "";
			video.currentTime = 0;
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
			const videoPosterImages = document.querySelectorAll(".video-poster-img");
			// console.log(videoPosterImages);
			if (video.src && video.src.startsWith('blob:')) {
				URL.revokeObjectURL(video.src);
				if (butlerVideosDirectoryHandle && currentProfile.opfsProfileDirectoryHandle && video.title) {
					currentProfile.opfsProfileDirectoryHandle.removeEntry(video.title).then(() => {
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

			const file = e.target.files[0];
			const videoTestElement = document.createElement('video');
			console.log("canPlay: ", videoTestElement.canPlayType(file.type));
			if (file && validVideoFileType(file) && videoTestElement.canPlayType(file.type)) {
				videoIndicator.style.backgroundImage = `url(${sourceIsUploadingIndicatorPath})`; // This line resolves to "https://username.github.io/img/tube-spinner-x27.svg" on github pages and not to "https://username.github.io/[reponame]/img/tube-spinner-x27.svg"

				// Check if video file is already in opfs for this profile, if it is, return and alert the user that they have already selected this file. This is to prevent duplicates in OPFS and also to prevent unnecessary writes to OPFS which can cause performance issues.
				const isFilePresentInOPFS = await currentProfile.opfsProfileDirectoryHandle.getFileHandle(file.name).then(() => true).catch(() => false);
				if (isFilePresentInOPFS) {
					// Make the alert a dialog that the user has to click "OK" on to dismiss, instead of a temporary alert that disappears after a few seconds, because the user might miss it if they are not looking at the screen when it appears. Also, make sure to not create multiple alerts if the user keeps selecting the same file.
					if (sourceSelectorSection.querySelector("#duplicate-file-alert")) {
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
					return;
				}

				const fileHandle = await currentProfile.opfsProfileDirectoryHandle.getFileHandle(file.name, { create: true });
				const videoUrl = URL.createObjectURL(file);
				const thumbnailBlobData = await generateThumbnail(URL.createObjectURL(file)).then(thumbnailUrl => {
					return fetch(thumbnailUrl).then(res => res.blob());
				}).catch(err => {
					console.error("Error generating thumbnail blob: ", err);
					return null;
				});
				const thumbnailFileHandle = await currentProfile.opfsProfileDirectoryHandle.getFileHandle(`thumbnail_${file.name}.jpg`, { create: true });
				
				// Write to it
				const writable = await fileHandle.createWritable();
				await writable.write(file);
				await writable.close();
				videoIndicator.style.backgroundImage = "none";

				const thumbnailWritable = await thumbnailFileHandle.createWritable();
				await thumbnailWritable.write(thumbnailBlobData);
				await thumbnailWritable.close();
				storageInfo();

				// Read it later
				const videoFile = await fileHandle.getFile();
				// console.log(`File read from OPFS: ${videoFile.name}, size: ${videoFile.size / (1024*1024*1024)} GB, type: ${videoFile.type}`);
				const thumbnailFile = await thumbnailFileHandle.getFile();
				// console.log(`Thumbnail file read from OPFS: ${thumbnailFile.name}, size: ${thumbnailFile.size} bytes, type: ${thumbnailFile.type}`);
				
				video.src = URL.createObjectURL(videoFile);
				video.title = videoFile.name;
				video.poster = URL.createObjectURL(thumbnailFile);
				video.posterTitle = thumbnailFile.name;
				videoIndicator.textContent = emojiMap.checkmark;
			} else {
				alert("Lütfen geçerli bir video dosyası seçin.");
			}
			updateVideoList();
			saveState();
			// console.log("VIDEOS ==========> ", state.profiles[state.currentProfileId].videos);
			renderSourceSelectors();
			renderVideoList();
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
		posterUploadInput.addEventListener("change", (e) => {
			// working here 
			const file = e.target.files[0];
			if (file && validImageFileType(file)) {
				video.poster = URL.createObjectURL(file);
				posterIndicator.textContent = emojiMap.checked;
				saveState();
				renderSourceSelectors();
				renderVideoList();
			} else {
				alert("Lütfen geçerli bir resim dosyası seçin.");
			}
		});

		const clearRowBtn = document.createElement("button");
		clearRowBtn.type = "button";
		clearRowBtn.className = "btn btn-sm btn-warning remove-source-btn settings-btn";
		clearRowBtn.id = `remove-source-${video.id + 1}-btn`;
		clearRowBtn.textContent = "Sil";
		clearRowBtn.addEventListener("click", async () => {
			if (video.src && video.src.startsWith('blob:')) {
				URL.revokeObjectURL(video.src);
			}
			if (video.poster && video.poster.startsWith('blob:')) {
				URL.revokeObjectURL(video.poster);
			}
			if (butlerVideosDirectoryHandle && currentProfile.opfsProfileDirectoryHandle && video.title) {
				currentProfile.opfsProfileDirectoryHandle.removeEntry(video.title).then(() => {
					storageInfo();
				}).catch(err => {
					console.error("Error removing video file from OPFS: ", err);
				});
			}
			if (butlerVideosDirectoryHandle && currentProfile.opfsProfileDirectoryHandle && video.title && video.poster) {
				currentProfile.opfsProfileDirectoryHandle.removeEntry(video.posterTitle).then(() => {
					// console.log("Thumbnail file removed from OPFS.");
				}).catch(err => {
					console.error("Error removing thumbnail file from OPFS: ", err);
				});
			}
			video.title = "";
			video.src = "";
			video.poster = "";
			video.posterTitle = "";
			video.alt = "";
			video.currentTime = 0;
			updateVideoList();
			saveState();
			// console.log("VIDEOS ==========> ", state.profiles[state.currentProfileId].videos);
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

		const videoTitle = document.createElement("div");
		videoTitle.className = "source-selection-section-video-title";
		videoTitle.textContent = `${video.title}` || "";

		rowContainer.appendChild(row);
		rowContainer.appendChild(videoTitle);
		
		sourceSelectorSection.appendChild(rowContainer);
	}
}

function createDefaultVideoList() {
	state.profiles[state.currentProfileId].videos = [];
	for (let i = 0; i < state.profiles[state.currentProfileId].videoCount; i++) {
		state.profiles[state.currentProfileId].videos[i] = {
			id: i,
			title: "",
			src: "",
			poster: "",
			posterTitle: "",
			alt: "",
			currentTime: 0,
		};
	}
}

function updateVideoList() {
	const currentProfile = state.profiles[state.currentProfileId];
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
				title: "",
				src: "",
				poster: "",
				posterTitle: "",
				alt: "",
				currentTime: 0,
			};
		}
	}

	state.profiles[state.currentProfileId].videos = newList;
	localStorage.setItem("videos", JSON.stringify(state.profiles[state.currentProfileId].videos));
}

// window.addEventListener("orientationchange", function() {
// 	fitThumbnailsInViewport();
// }, false);

window.addEventListener('resize', () => fitThumbnailsInViewport(state.profiles[state.currentProfileId].videoCount));

async function renderVideoList() {
	videoListGrid.innerHTML = "";
	videoListGrid.className = `video-list-grid count-${state.profiles[state.currentProfileId].videoCount}`;
	
	for (const video of state.profiles[state.currentProfileId].videos) {
		const videoListItem = document.createElement("div");
		videoListItem.className = "video-list-item";
		const img = document.createElement("img");
		img.className = "thumbnail video-poster-img";
		img.alt = video.alt || video.title || `Video ${video.id + 1}`;
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

		if (!video.src || video.src === "") {
			videoListItem.style.backgroundColor = "#333";
		}

		if (video.src && video.src !== "") {
			const overlay = document.createElement("div");
			overlay.className = "video-title-overlay";
			if (video.title && video.title !== "") {
				overlay.textContent = video.title.length < 26 ? video.title : `${video.title.slice(0, 26)}...`;
			} else {
				overlay.textContent = `Video ${video.id + 1}`;
			}
			videoListItem.appendChild(overlay);
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
			console.log("Playing video URL:", videoUrl);
			// 1. Show player
    		playerContainer.style.display = 'block';
			vp.src({ src: videoUrl, type: 'video/mp4'});
			openFullscreen(vp);
			state.currentlyPlayingVideoId = video.id;
			vp.volume(state.currentVolume);
			saveState();
			vp.play();
		});
		videoListGrid.appendChild(videoListItem);
	}
	const videoPosterImages = document.querySelectorAll(".video-poster-img");
	for (const [i, video] of state.profiles[state.currentProfileId].videos.entries()) {
		const imgEl = videoPosterImages[i];
		// if DOM <img> for this slot doesn't exist, skip safely
		if (!imgEl) continue;

		if (video.src && video.src !== "") {
			if (video.poster && video.poster !== "" && video.posterTitle) {
				const currentProfile = state.profiles[state.currentProfileId];
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
							// console.log(`Set thumbnail for ${video.title} in profile ${currentProfile.name}: `, thumbnailUrl);
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
	fitThumbnailsInViewport(state.profiles[state.currentProfileId].videos.length);
}

function generateThumbnail(videoSrc) {
	return new Promise((resolve, reject) => {
		const video = document.createElement('video');
		video.src = videoSrc;
		video.crossOrigin = "anonymous";
		video.addEventListener('loadeddata', () => {
			video.currentTime = THUMBNAIL_GENERATION_TIME; // Capture thumbnail at nth second
		});
		video.addEventListener('seeked', () => {
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

/* View in fullscreen */
async function openFullscreen(player) {
	try {
		if (player.requestFullscreen) {
			await player.requestFullscreen({navigationUI: 'hide'});
		} else if (player.webkitRequestFullscreen) { /* Safari */
			await player.webkitRequestFullscreen({navigationUI: 'hide'});
		} else if (player.msRequestFullscreen) { /* IE11 */
			await player.msRequestFullscreen({navigationUI: 'hide'});
		}
		player.currentTime(
			state.profiles[state.currentProfileId].videos[state.currentlyPlayingVideoId].currentTime || 
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
		state.profiles[state.currentProfileId].videos[state.currentlyPlayingVideoId].currentTime = 0;
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
		state.profiles[state.currentProfileId].videos[state.currentlyPlayingVideoId].currentTime = vp.currentTime();
		state.currentlyPlayingVideoId = null;
		saveState();

		vpElement.style.display = 'none';
		
		// URL.revokeObjectURL(vp.src());
		document.removeEventListener('fullscreenchange', onFullscreenChange);
	};

	function onFullscreenChange() {
		if (!document.fullscreenElement) cleanup();
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

async function testPlayback(file, timeoutMs = 800) {
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
        reject(new Error("Playback failed"));
      }
    };

    video.onerror = () => {
      cleanup();
      reject(new Error("Video error during playback"));
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
	// Video
	// ID                                       : 1
	// Format                                   : HEVC
	// Format/Info                              : High Efficiency Video Coding
	// Format profile                           : Main 10@L4@Main
	// Codec ID                                 : V_MPEGH/ISO/HEVC
	// Duration                                 : 50 min 2 s
	// Bit rate                                 : 2 229 kb/s
	// Width                                    : 1 920 pixels
	// Height                                   : 800 pixels
	// Display aspect ratio                     : 2.40:1
	// Frame rate mode                          : Constant
	// Frame rate                               : 23.976 (24000/1001) FPS
	// Color space                              : YUV
	// Chroma subsampling                       : 4:2:0
	// Bit depth                                : 10 bits
	// Bits/(Pixel*Frame)                       : 0.061
	// Stream size                              : 798 MiB (91%)
	// Default                                  : Yes
	// Forced                                   : No
	// Color range                              : Limited
	// Color primaries                          : BT.709
	// Transfer characteristics                 : BT.709
	// Matrix coefficients                      : BT.709
	// what would be the appropriate MIME type for this video? "video/hevc" or "video/H265" or "video/H266"? I will include all three in the list just to be safe, but in testing I will pay attention to which one actually works for this specific video and make a note of it for future reference.
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
