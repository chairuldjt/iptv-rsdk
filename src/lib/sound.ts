import prisma from '@/lib/db'

const SOUND_PREFERENCE_KEY = 'sound.muteSelectionSound'

export async function getSoundPreference(deviceId?: string): Promise<boolean> {
  if (deviceId) {
    const setting = await prisma.soundPreference.findUnique({
      where: { deviceId },
    })
    return setting?.muteSelectionSound ?? false
  }
  
  // Get from app setting as default
  const setting = await prisma.appSetting.findUnique({
    where: { key: SOUND_PREFERENCE_KEY },
  })
  return setting?.value === 'true'
}

export async function setSoundPreference(enabled: boolean): Promise<void> {
  await prisma.appSetting.upsert({
    where: { key: SOUND_PREFERENCE_KEY },
    update: { value: enabled.toString() },
    create: {
      key: SOUND_PREFERENCE_KEY,
      value: enabled.toString(),
    },
  })
}

export async function setSoundPreferenceByDeviceId(deviceId: string, enabled: boolean): Promise<void> {
  await prisma.soundPreference.upsert({
    where: { deviceId },
    update: { muteSelectionSound: enabled },
    create: {
      deviceId,
      muteSelectionSound: enabled,
    },
  })
}

export async function getSoundPreferenceByDeviceId(deviceId: string): Promise<boolean> {
  const setting = await prisma.soundPreference.findUnique({
    where: { deviceId },
  })
  return setting?.muteSelectionSound ?? false
}

export async function enableSoundEffect(): Promise<void> {
  await setSoundPreferenceByDeviceId('STB-RSDK-DEVICE', false)
}

export async function disableSoundEffect(): Promise<void> {
  await setSoundPreferenceByDeviceId('STB-RSDK-DEVICE', true)
}