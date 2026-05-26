// ============================================================
// src/device-registry.ts
// ============================================================
import { DeviceRegistered, DeviceLostToPool, DeviceDeactivated } from "../generated/DeviceRegistry/DeviceRegistry"
import { Device } from "../generated/schema"
import { BigInt } from "@graphprotocol/graph-ts"

export function handleDeviceRegistered(event: DeviceRegistered): void {
  let device = new Device(event.params.deviceId)
  device.owner = event.params.owner
  device.registeredAt = event.block.timestamp
  device.lastActiveAt = event.block.timestamp
  device.totalRequests = BigInt.fromI32(0)
  device.active = true
  device.inLostPool = false
  device.save()
}

export function handleDeviceLostToPool(event: DeviceLostToPool): void {
  let device = Device.load(event.params.deviceId)
  if (device) {
    device.active = false
    device.inLostPool = true
    device.save()
  }
}

export function handleDeviceDeactivated(event: DeviceDeactivated): void {
  let device = Device.load(event.params.deviceId)
  if (device) {
    device.active = false
    device.save()
  }
}