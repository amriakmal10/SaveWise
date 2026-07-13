
// flag and being asked for the wrong code).
export function getPasscodeHashKey(userId: string) {
  return `savewise_passcode_hash_${userId}`;
}

export function getHasPasscodeKey(userId: string) {
  return `savewise_has_passcode_${userId}`;
}