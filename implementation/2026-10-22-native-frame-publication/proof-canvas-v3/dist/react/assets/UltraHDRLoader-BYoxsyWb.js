import { $r as RGBAFormat, Bn as LinearMipMapLinearFilter, Ft as FileLoader, Kn as Loader, Rn as LinearFilter, V as ClampToEdgeWrapping, Wn as LinearSRGBColorSpace, Yt as HalfFloatType, ft as DataTexture, mt as DataUtils } from "./three.core-B6SbQD8c.js";
// node_modules/.pnpm/three@0.186.1/node_modules/three/examples/jsm/loaders/UltraHDRLoader.js
/**
* UltraHDR Image Format - https://developer.android.com/media/platform/hdr-image-format
*
* Short format brief:
*
*  [JPEG headers]
*  [Metadata describing the MPF container and both SDR and gainmap images]
*    - XMP metadata (legacy format)
*    - ISO 21496-1 metadata (current standard)
*  [Optional metadata] [EXIF] [ICC Profile]
*  [SDR image]
*  [Gainmap image with metadata]
*
* Each section is separated by a 0xFFXX byte followed by a descriptor byte (0xFFE0, 0xFFE1, 0xFFE2.)
* Binary image storages are prefixed with a unique 0xFFD8 16-bit descriptor.
*/
var SRGB_TO_LINEAR = /* @__PURE__ */ new Float64Array(1024);
for (let i = 0; i < 1024; i++) SRGB_TO_LINEAR[i] = Math.pow(i * .003717127 + .0521327014, 2.4);
/**
* A loader for the Ultra HDR Image Format.
*
* Existing HDR or EXR textures can be converted to Ultra HDR with this [tool](https://gainmap-creator.monogrid.com/).
*
* Current feature set:
* - JPEG headers (required)
* - XMP metadata (legacy format, supported)
* - ISO 21496-1 metadata (current standard, supported)
* - XMP validation (not implemented)
* - EXIF profile (not implemented)
* - ICC profile (not implemented)
* - Binary storage for SDR & HDR images (required)
* - Gainmap metadata (required)
* - Non-JPEG image formats (not implemented)
* - Primary image as an HDR image (not implemented)
*
* ```js
* const loader = new UltraHDRLoader();
* const texture = await loader.loadAsync( 'textures/equirectangular/ice_planet_close.jpg' );
* texture.mapping = THREE.EquirectangularReflectionMapping;
*
* scene.background = texture;
* scene.environment = texture;
* ```
*
* @augments Loader
* @three_import import { UltraHDRLoader } from 'three/addons/loaders/UltraHDRLoader.js';
*/
var UltraHDRLoader = class extends Loader {
	/**
	* Constructs a new Ultra HDR loader.
	*
	* @param {LoadingManager} [manager] - The loading manager.
	*/
	constructor(manager) {
		super(manager);
		/**
		* The texture type.
		*
		* @type {(HalfFloatType|FloatType)}
		* @default HalfFloatType
		*/
		this.type = HalfFloatType;
	}
	/**
	* Sets the texture type.
	*
	* @param {(HalfFloatType|FloatType)} value - The texture type to set.
	* @return {UltraHDRLoader} A reference to this loader.
	*/
	setDataType(value) {
		this.type = value;
		return this;
	}
	/**
	* Parses the given Ultra HDR texture data.
	*
	* @param {ArrayBuffer} buffer - The raw texture data.
	* @param {Function} onLoad - The `onLoad` callback.
	*/
	parse(buffer, onLoad) {
		const metadata = {
			version: null,
			baseRenditionIsHDR: null,
			gainMapMin: null,
			gainMapMax: null,
			gamma: null,
			offsetSDR: null,
			offsetHDR: null,
			hdrCapacityMin: null,
			hdrCapacityMax: null
		};
		const textDecoder = new TextDecoder();
		const bytes = new Uint8Array(buffer);
		const sections = [];
		let offset = 0;
		while (offset < bytes.length - 1) {
			if (bytes[offset] !== 255) {
				offset++;
				continue;
			}
			const markerType = bytes[offset + 1];
			if (markerType === 216) {
				sections.push({
					sectionType: markerType,
					section: bytes.subarray(offset, offset + 2),
					sectionOffset: offset + 2
				});
				offset += 2;
				continue;
			}
			if (markerType === 224 || markerType === 225 || markerType === 226) {
				const segmentLength = bytes[offset + 2] << 8 | bytes[offset + 3];
				const segmentEnd = offset + 2 + segmentLength;
				sections.push({
					sectionType: markerType,
					section: bytes.subarray(offset, segmentEnd),
					sectionOffset: offset + 2
				});
				offset = segmentEnd;
				continue;
			}
			if (markerType >= 192 && markerType <= 254 && markerType !== 217 && (markerType < 208 || markerType > 215)) {
				const segmentLength = bytes[offset + 2] << 8 | bytes[offset + 3];
				offset += 2 + segmentLength;
				continue;
			}
			offset += 2;
		}
		let primaryImage, gainmapImage;
		for (let i = 0; i < sections.length; i++) {
			const { sectionType, section, sectionOffset } = sections[i];
			if (sectionType === 224) {} else if (sectionType === 225) this._parseXMPMetadata(textDecoder.decode(new Uint8Array(section)), metadata);
			else if (sectionType === 226) {
				const sectionData = new DataView(section.buffer, section.byteOffset + 2, section.byteLength - 2);
				const isoNameSpace = "urn:iso:std:iso:ts:21496:-1\0";
				if (section.byteLength >= 30) {
					let isISO = true;
					for (let j = 0; j < 28; j++) if (section[2 + j] !== isoNameSpace.charCodeAt(j)) {
						isISO = false;
						break;
					}
					if (isISO) {
						const isoData = section.subarray(30);
						this._parseISOMetadata(isoData, metadata);
						continue;
					}
				}
				if (sectionData.getUint32(2, false) === 1297106432) {
					const mpfLittleEndian = sectionData.getUint32(6) === 1229531648;
					const primaryImageSize = sectionData.getUint32(60, mpfLittleEndian);
					const primaryImageOffset = sectionData.getUint32(64, mpfLittleEndian);
					const gainmapImageSize = sectionData.getUint32(76, mpfLittleEndian);
					const gainmapImageOffset = sectionData.getUint32(80, mpfLittleEndian) + sectionOffset + 6;
					primaryImage = new Uint8Array(buffer, primaryImageOffset, primaryImageSize);
					gainmapImage = new Uint8Array(buffer, gainmapImageOffset, gainmapImageSize);
				}
			}
		}
		if (!metadata.version) throw new Error("THREE.UltraHDRLoader: Not a valid UltraHDR image");
		if (primaryImage && gainmapImage) this._applyGainmapToSDR(metadata, primaryImage, gainmapImage, (hdrBuffer, width, height) => {
			onLoad({
				width,
				height,
				data: hdrBuffer,
				format: RGBAFormat,
				type: this.type
			});
		}, (error) => {
			throw new Error(error);
		});
		else throw new Error("THREE.UltraHDRLoader: Could not parse UltraHDR images");
	}
	/**
	* Parses ISO 21496-1 gainmap metadata from binary data.
	*
	* @private
	* @param {Uint8Array} data - The binary ISO metadata.
	* @param {Object} metadata - The metadata object to populate.
	*/
	_parseISOMetadata(data, metadata) {
		const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
		let offset = 4;
		const flags = view.getUint8(offset);
		offset += 1;
		const backwardDirection = (flags & 4) !== 0;
		const useCommonDenominator = (flags & 8) !== 0;
		let gainMapMin, gainMapMax, gamma, offsetSDR, offsetHDR, hdrCapacityMin, hdrCapacityMax;
		if (useCommonDenominator) {
			const commonDenominator = view.getUint32(offset, false);
			offset += 4;
			const baseHdrHeadroomN = view.getUint32(offset, false);
			offset += 4;
			hdrCapacityMin = Math.log2(baseHdrHeadroomN / commonDenominator);
			const alternateHdrHeadroomN = view.getUint32(offset, false);
			offset += 4;
			hdrCapacityMax = Math.log2(alternateHdrHeadroomN / commonDenominator);
			const gainMapMinN = view.getInt32(offset, false);
			offset += 4;
			gainMapMin = gainMapMinN / commonDenominator;
			const gainMapMaxN = view.getInt32(offset, false);
			offset += 4;
			gainMapMax = gainMapMaxN / commonDenominator;
			const gammaN = view.getUint32(offset, false);
			offset += 4;
			gamma = gammaN / commonDenominator;
			const offsetSDRN = view.getInt32(offset, false);
			offset += 4;
			offsetSDR = offsetSDRN / commonDenominator * 255;
			offsetHDR = view.getInt32(offset, false) / commonDenominator * 255;
		} else {
			const baseHdrHeadroomN = view.getUint32(offset, false);
			offset += 4;
			const baseHdrHeadroomD = view.getUint32(offset, false);
			offset += 4;
			hdrCapacityMin = Math.log2(baseHdrHeadroomN / baseHdrHeadroomD);
			const alternateHdrHeadroomN = view.getUint32(offset, false);
			offset += 4;
			const alternateHdrHeadroomD = view.getUint32(offset, false);
			offset += 4;
			hdrCapacityMax = Math.log2(alternateHdrHeadroomN / alternateHdrHeadroomD);
			const gainMapMinN = view.getInt32(offset, false);
			offset += 4;
			const gainMapMinD = view.getUint32(offset, false);
			offset += 4;
			gainMapMin = gainMapMinN / gainMapMinD;
			const gainMapMaxN = view.getInt32(offset, false);
			offset += 4;
			const gainMapMaxD = view.getUint32(offset, false);
			offset += 4;
			gainMapMax = gainMapMaxN / gainMapMaxD;
			const gammaN = view.getUint32(offset, false);
			offset += 4;
			const gammaD = view.getUint32(offset, false);
			offset += 4;
			gamma = gammaN / gammaD;
			const offsetSDRN = view.getInt32(offset, false);
			offset += 4;
			const offsetSDRD = view.getUint32(offset, false);
			offset += 4;
			offsetSDR = offsetSDRN / offsetSDRD * 255;
			const offsetHDRN = view.getInt32(offset, false);
			offset += 4;
			offsetHDR = offsetHDRN / view.getUint32(offset, false) * 255;
		}
		metadata.version = "1.0";
		metadata.baseRenditionIsHDR = backwardDirection;
		metadata.gainMapMin = gainMapMin;
		metadata.gainMapMax = gainMapMax;
		metadata.gamma = gamma;
		metadata.offsetSDR = offsetSDR;
		metadata.offsetHDR = offsetHDR;
		metadata.hdrCapacityMin = hdrCapacityMin;
		metadata.hdrCapacityMax = hdrCapacityMax;
	}
	/**
	* Starts loading from the given URL and passes the loaded Ultra HDR texture
	* to the `onLoad()` callback.
	*
	* @param {string} url - The path/URL of the files to be loaded. This can also be a data URI.
	* @param {function(DataTexture, Object)} onLoad - Executed when the loading process has been finished.
	* @param {onProgressCallback} onProgress - Executed while the loading is in progress.
	* @param {onErrorCallback} onError - Executed when errors occur.
	* @return {DataTexture} The Ultra HDR texture.
	*/
	load(url, onLoad, onProgress, onError) {
		const texture = new DataTexture(this.type === 1016 ? /* @__PURE__ */ new Uint16Array() : /* @__PURE__ */ new Float32Array(), 0, 0, RGBAFormat, this.type, 300, ClampToEdgeWrapping, ClampToEdgeWrapping, LinearFilter, LinearMipMapLinearFilter, 1, LinearSRGBColorSpace);
		texture.generateMipmaps = true;
		texture.flipY = true;
		const loader = new FileLoader(this.manager);
		loader.setResponseType("arraybuffer");
		loader.setRequestHeader(this.requestHeader);
		loader.setPath(this.path);
		loader.setWithCredentials(this.withCredentials);
		loader.load(url, (buffer) => {
			try {
				this.parse(buffer, (texData) => {
					texture.image = {
						data: texData.data,
						width: texData.width,
						height: texData.height
					};
					texture.needsUpdate = true;
					if (onLoad) onLoad(texture, texData);
				});
			} catch (error) {
				if (onError) onError(error);
				console.error(error);
			}
		}, onProgress, onError);
		return texture;
	}
	_parseXMPMetadata(xmpDataString, metadata) {
		const xmpXml = new DOMParser().parseFromString(xmpDataString.substring(xmpDataString.indexOf("<"), xmpDataString.lastIndexOf(">") + 1), "text/xml");
		const [hasHDRContainerDescriptor] = xmpXml.getElementsByTagName("Container:Directory");
		if (hasHDRContainerDescriptor) {} else {
			const [gainmapNode] = xmpXml.getElementsByTagName("rdf:Description");
			metadata.version = gainmapNode.getAttribute("hdrgm:Version");
			metadata.baseRenditionIsHDR = gainmapNode.getAttribute("hdrgm:BaseRenditionIsHDR") === "True";
			metadata.gainMapMin = parseFloat(gainmapNode.getAttribute("hdrgm:GainMapMin") || 0);
			metadata.gainMapMax = parseFloat(gainmapNode.getAttribute("hdrgm:GainMapMax") || 1);
			metadata.gamma = parseFloat(gainmapNode.getAttribute("hdrgm:Gamma") || 1);
			metadata.offsetSDR = parseFloat(gainmapNode.getAttribute("hdrgm:OffsetSDR") / (1 / 64));
			metadata.offsetHDR = parseFloat(gainmapNode.getAttribute("hdrgm:OffsetHDR") / (1 / 64));
			metadata.hdrCapacityMin = parseFloat(gainmapNode.getAttribute("hdrgm:HDRCapacityMin") || 0);
			metadata.hdrCapacityMax = parseFloat(gainmapNode.getAttribute("hdrgm:HDRCapacityMax") || 1);
		}
	}
	_srgbToLinear(value) {
		if (value < 10.31475) return value * 303527e-9;
		if (value < 1024) return SRGB_TO_LINEAR[value | 0];
		return Math.pow(value * .003717127 + .0521327014, 2.4);
	}
	_applyGainmapToSDR(metadata, sdrBuffer, gainmapBuffer, onSuccess, onError) {
		const decodeImage = (data) => createImageBitmap(new Blob([data], { type: "image/jpeg" }));
		Promise.all([decodeImage(sdrBuffer), decodeImage(gainmapBuffer)]).then(([sdrImage, gainmapImage]) => {
			const sdrWidth = sdrImage.width;
			const sdrHeight = sdrImage.height;
			if (sdrWidth / sdrHeight !== gainmapImage.width / gainmapImage.height) {
				onError("THREE.UltraHDRLoader Error: Aspect ratio mismatch between SDR and Gainmap images");
				return;
			}
			const canvas = document.createElement("canvas");
			const ctx = canvas.getContext("2d", {
				willReadFrequently: true,
				colorSpace: "srgb"
			});
			canvas.width = sdrWidth;
			canvas.height = sdrHeight;
			ctx.drawImage(gainmapImage, 0, 0, gainmapImage.width, gainmapImage.height, 0, 0, sdrWidth, sdrHeight);
			const gainmapImageData = ctx.getImageData(0, 0, sdrWidth, sdrHeight, { colorSpace: "srgb" });
			ctx.drawImage(sdrImage, 0, 0);
			const sdrImageData = ctx.getImageData(0, 0, sdrWidth, sdrHeight, { colorSpace: "srgb" });
			const maxDisplayBoost = 1.8 ** (metadata.hdrCapacityMax * .5);
			const unclampedWeightFactor = (Math.log2(maxDisplayBoost) - metadata.hdrCapacityMin) / (metadata.hdrCapacityMax - metadata.hdrCapacityMin);
			const weightFactor = Math.min(Math.max(unclampedWeightFactor, 0), 1);
			const sdrData = sdrImageData.data;
			const gainmapData = gainmapImageData.data;
			const dataLength = sdrData.length;
			const gainMapMin = metadata.gainMapMin;
			const gainMapMax = metadata.gainMapMax;
			const offsetSDR = metadata.offsetSDR;
			const offsetHDR = metadata.offsetHDR;
			const invGamma = 1 / metadata.gamma;
			const useGammaOne = metadata.gamma === 1;
			const isHalfFloat = this.type === HalfFloatType;
			const toHalfFloat = DataUtils.toHalfFloat;
			const srgbToLinear = this._srgbToLinear;
			const hdrBuffer = isHalfFloat ? new Uint16Array(dataLength).fill(15360) : new Float32Array(dataLength).fill(1);
			for (let i = 0; i < dataLength; i += 4) for (let c = 0; c < 3; c++) {
				const idx = i + c;
				const sdrValue = sdrData[idx];
				const gainmapValue = gainmapData[idx] * .00392156862745098;
				const logRecovery = useGammaOne ? gainmapValue : Math.pow(gainmapValue, invGamma);
				const logBoost = gainMapMin + (gainMapMax - gainMapMin) * logRecovery;
				const hdrValue = (sdrValue + offsetSDR) * (logBoost * weightFactor === 0 ? 1 : Math.pow(2, logBoost * weightFactor)) - offsetHDR;
				const linearHDRValue = Math.min(Math.max(srgbToLinear(hdrValue), 0), 65504);
				hdrBuffer[idx] = isHalfFloat ? toHalfFloat(linearHDRValue) : linearHDRValue;
			}
			onSuccess(hdrBuffer, sdrWidth, sdrHeight);
		}).catch((e) => {
			onError(e);
		});
	}
};
export { UltraHDRLoader };
