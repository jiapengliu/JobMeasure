using System;
using System.Diagnostics;
using UserInfoCommonLib;
using WebConsoleCommonLib;

namespace UserTreeLib
{
    public class ProxyAdapterBase
    {
        public DateTime TimeStamp { get; set; }
        public string AdminName { get; set; }
        public UserTypeEnum Type { get; set; }

        public bool IsBusy { get; protected set; }

        public void BeginDownload(Action callback, Action<Exception> errorCallback)
        {
            Debug.Assert(IsBusy == false);
            Debug.Assert(callback != null);
            Debug.Assert(errorCallback != null);
            Debug.Assert(!string.IsNullOrEmpty(AdminName));

            IsBusy = true;
            _callback = callback;
            _errorCallback = errorCallback;

            OnBeginDownload();
        }

        protected virtual void OnBeginDownload()
        {
        }

        protected void Finish()
        {
            IsBusy = false;
            _callback();
        }

        protected bool HasError(IUserInfoProxy proxy)
        {
            if (proxy.HasError)
            {
                IsBusy = false;
                _errorCallback(proxy.Error);

                return true;
            }

            return false;
        }

        protected Action<Exception> _errorCallback;
        protected Action _callback;
    }
}
