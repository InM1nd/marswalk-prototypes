// Plain <img> tags don't get Next's basePath, so asset URLs carry it explicitly.
export const BASE_PATH = '/advent';
export const asset = (file: string) => `${BASE_PATH}/assets/${file}`;
