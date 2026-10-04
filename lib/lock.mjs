export function makeLock(result, { previous, submitter, now }) {
  return {
    ...result,
    submitter: previous?.submitter ?? submitter,
    listedAt: previous?.listedAt ?? now,
    updatedAt: now,
  }
}
