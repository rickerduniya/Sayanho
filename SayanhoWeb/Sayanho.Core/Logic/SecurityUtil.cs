using System;

namespace Sayanho.Core.Logic
{
    /// <summary>
    /// Security utilities - encryption removed per user request
    /// </summary>
    public static class SecurityUtil
    {
        // No encryption - returns empty key
        public static byte[] LoadOrCreateEncryptedKey(string appDir)
        {
            return Array.Empty<byte>();
        }

        public static byte[] ProtectKey(byte[] rawKey)
        {
            return rawKey;
        }

        public static byte[] UnprotectKey(byte[] protectedKey)
        {
            return protectedKey;
        }
    }
}
