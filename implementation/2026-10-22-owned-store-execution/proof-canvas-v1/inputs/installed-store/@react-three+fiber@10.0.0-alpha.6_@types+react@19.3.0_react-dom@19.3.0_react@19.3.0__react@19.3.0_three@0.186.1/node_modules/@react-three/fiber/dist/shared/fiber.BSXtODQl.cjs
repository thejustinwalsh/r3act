'use strict';

const Canvas = require('./fiber.TRm3lZ7I.cjs');
const textureStaging = require('./fiber.BO8-26r8.cjs');

const useThree = textureStaging.useThree;
const useFrame = textureStaging.useFrame;
const useRenderTarget = Canvas.useRenderTarget;
const asWebGPUCanvas = (Canvas) => Canvas;

exports.asWebGPUCanvas = asWebGPUCanvas;
exports.useFrame = useFrame;
exports.useRenderTarget = useRenderTarget;
exports.useThree = useThree;
