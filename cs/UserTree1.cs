using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Diagnostics;
using System.Linq;
using System.Windows;
using System.Windows.Controls;
using UserInfoCommonLib;
using System.Windows.Media;
using System.Windows.Controls.Primitives;
using WebConsoleCommonLib;

namespace UserTreeLib
{
    public class UserTree : Control
    {
        public const int INVALID_USER_ID = int.MinValue;
        public const int INVALID_PARENT_ID = int.MinValue;

        public event EventHandler UserChanged;

        #region Output Paramaters

        #region CheckedUserID

        public int CheckedUserID
        {
            get { return (int)GetValue(CheckedUserIDProperty); }
            set { SetValue(CheckedUserIDProperty, value); }
        }

        public static readonly DependencyProperty CheckedUserIDProperty =
            DependencyProperty.Register("CheckedUserID", typeof(int), typeof(UserTree), new PropertyMetadata(INVALID_USER_ID));

        #endregion

        #region CheckedUserIDs

        public int[] CheckedUserIDs
        {
            get { return (int[])GetValue(CheckedUserIDsProperty); }
            set { SetValue(CheckedUserIDsProperty, value); }
        }

        public static readonly DependencyProperty CheckedUserIDsProperty =
            DependencyProperty.Register("CheckedUserIDs", typeof(int[]), typeof(UserTree), new PropertyMetadata(null));

        #endregion

        #region CheckedItem

        public UserTreeItemModel CheckedItem
        {
            get { return (UserTreeItemModel)GetValue(CheckedItemProperty); }
            set { SetValue(CheckedItemProperty, value); }
        }

        public static readonly DependencyProperty CheckedItemProperty =
            DependencyProperty.Register("CheckedItem", typeof(UserTreeItemModel), typeof(UserTree), new PropertyMetadata(null));

        #endregion

        #endregion

        #region ParentID

        public int ParentID
        {
            get { return (int)GetValue(ParentIDProperty); }
            set { SetValue(ParentIDProperty, value); }
        }

        public static readonly DependencyProperty ParentIDProperty =
            DependencyProperty.Register("ParentID", typeof(int), typeof(UserTree),
            new PropertyMetadata(INVALID_PARENT_ID));

        #endregion

        #region CurrentParentID

        public int CurrentParentID
        {
            get { return (int)GetValue(CurrentParentIDProperty); }
            set { SetValue(CurrentParentIDProperty, value); }
        }

        public static readonly DependencyProperty CurrentParentIDProperty =
            DependencyProperty.Register("CurrentParentID", typeof(int), typeof(UserTree),
            new PropertyMetadata(INVALID_PARENT_ID, OnCurrentParentIDChanged));

        protected static void OnCurrentParentIDChanged(DependencyObject o, DependencyPropertyChangedEventArgs e)
        {
            ((UserTree)o).OnCurrentParentIDChanged((int)e.OldValue, (int)e.NewValue);
        }

        protected void OnCurrentParentIDChanged(int oldValue, int newValue)
        {
            if (oldValue != newValue)
            {
                if (ParentID == INVALID_PARENT_ID)
                    return;

                if (CurrentParentID == INVALID_PARENT_ID)
                    return;

                if (oldValue == ParentID)
                    ShowToHide();
                else if (oldValue != INVALID_PARENT_ID && newValue == ParentID)
                    HideToShow();
            }
        }

        #endregion

        #region InputSelectedID

        public IDPair InputSelectedID
        {
            get { return (IDPair)GetValue(InputSelectedIDProperty); }
            set { SetValue(InputSelectedIDProperty, value); }
        }

        public static readonly DependencyProperty InputSelectedIDProperty =
            DependencyProperty.Register("InputSelectedID", typeof(IDPair), typeof(UserTree),
            new PropertyMetadata(null, OnInputSelectedIDChanged));

        protected static void OnInputSelectedIDChanged(DependencyObject o, DependencyPropertyChangedEventArgs e)
        {
            ((UserTree)o).OnInputSelectedIDChanged((IDPair)e.OldValue, (IDPair)e.NewValue);
        }

        protected void OnInputSelectedIDChanged(IDPair oldValue, IDPair newValue)
        {
            if (oldValue != newValue)
                DirectModifyOutput(newValue);
        }

        #endregion

        #region SelectedItem

        public bool SelectedItem
        {
            get { return (bool)GetValue(SelectedItemProperty); }
            set { SetValue(SelectedItemProperty, value); }
        }

        public static readonly DependencyProperty SelectedItemProperty =
            DependencyProperty.Register("SelectedItem", typeof(bool), typeof(UserTree),
            new PropertyMetadata(false, OnSelectedItemChanged));

        protected static void OnSelectedItemChanged(DependencyObject o, DependencyPropertyChangedEventArgs e)
        {
            ((UserTree)o).OnSelectedItemChanged((bool)e.OldValue, (bool)e.NewValue);
        }

        protected void OnSelectedItemChanged(bool oldValue, bool newValue)
        {
            if (newValue == true)
                HideToShow();
        }

        #endregion

        #region Show/Hide

        protected UserTreeItemModel _checkedItemBeforeHide;

        private void ShowToHide()
        {
            _checkedItemBeforeHide = CheckedItem;
        }

        private void HideToShow()
        {
            UserTreeItemModel newItem = GetItemByInput();
            if (newItem == null)
                return;

            UserTreeItemModel.IsSilent = true;

            if (_checkedItemBeforeHide != null)
            {
                if (_checkedItemBeforeHide == newItem)
                {
                    UserTreeItemModel.IsSilent = false;
                    return;
                }

                ExpandAllParent(_checkedItemBeforeHide, false);

                if (_checkedItemBeforeHide.IsGroup)
                {
                    _checkedItemBeforeHide.IsExpanded = false;
                    _checkedItemBeforeHide.IsGroupChecked = false;
                }
                else
                    _checkedItemBeforeHide.IsUserChecked = false;
            }

            ExpandAllParent(newItem, true);

            if (newItem.IsGroup)
                newItem.IsGroupChecked = true;
            else
                newItem.IsUserChecked = true;

            UserTreeItemModel.IsSilent = false;


            Debug.Assert(_itemsControl != null, "_itemsControl != null");
            Debug.Assert(_scrollViewer != null, "_scrollViewer != null");

            _itemsControl.LayoutUpdated += new EventHandler(_itemsControl_autoScroll_LayoutUpdated);
            UpdateVisibleItems();
        }

        void _itemsControl_autoScroll_LayoutUpdated(object sender, EventArgs e)
        {
            _itemsControl.LayoutUpdated -= _itemsControl_autoScroll_LayoutUpdated;

            _scrollViewer.ScrollToVerticalOffset(Math.Floor(UserTreePanel.ITEM_HEIGHT * _checkedItemRow));
        }

        protected UserTreeItemModel GetItemByInput()
        {
            if (InputSelectedID == null)
                return null;

            int gid = InputSelectedID.GroupID;
            int uid = InputSelectedID.UserID;

            UserTreeItemModel item = null;
            if (gid != INVALID_USER_ID)
            {
                if (_groupDic != null && _groupDic.ContainsKey(gid))
                    item = _groupDic[gid];
            }
            else if (uid != INVALID_USER_ID)
            {
                if (_userDic != null && _userDic.ContainsKey(uid))
                    item = _userDic[uid];
            }

            return item;
        }

        protected void ExpandAllParent(UserTreeItemModel model, bool toExpand)
        {
            Debug.Assert(model != null, "model != null");

            UserTreeItemModel parent = model.Parent;
            if (parent != null)
            {
                parent.IsExpanded = toExpand;
                ExpandAllParent(parent, toExpand);
            }
        }

        private void DirectModifyOutput(IDPair inputID)
        {
            if (inputID != null)
            {
                int gid = inputID.GroupID;
                int uid = inputID.UserID;

                if (gid != INVALID_USER_ID)
                {
                    if (_groupDic != null && _groupDic.ContainsKey(gid))
                        UserTreeItemModel_GroupChecked(_groupDic[gid]);
                }
                else if (uid != INVALID_USER_ID)
                {
                    if (_userDic != null && _userDic.ContainsKey(uid))
                        UserTreeItemModel_UserChecked(_userDic[uid]);
                }
            }
        }

        #endregion

        #region UserInfoType

        public UserTypeEnum UserInfoType
        {
            get { return (UserTypeEnum)GetValue(UserInfoTypeProperty); }
            set { SetValue(UserInfoTypeProperty, value); }
        }

        public static readonly DependencyProperty UserInfoTypeProperty =
            DependencyProperty.Register("UserInfoType", typeof(UserTypeEnum), typeof(UserTree),
            new PropertyMetadata(UserTypeEnum.Security, OnUserInfoTypeChanged));

        protected static void OnUserInfoTypeChanged(DependencyObject o, DependencyPropertyChangedEventArgs e)
        {
            ((UserTree)o).OnUserInfoTypeChanged((UserTypeEnum)e.OldValue, (UserTypeEnum)e.NewValue);
        }

        protected void OnUserInfoTypeChanged(UserTypeEnum oldValue, UserTypeEnum newValue)
        {
            if (oldValue != newValue)
                BeginDownload();
        }

        #endregion

        #region AdminName

        public string AdminName
        {
            get { return (string)GetValue(AdminNameProperty); }
            set { SetValue(AdminNameProperty, value); }
        }

        public static readonly DependencyProperty AdminNameProperty =
            DependencyProperty.Register("AdminName", typeof(string), typeof(UserTree), new PropertyMetadata(null, OnAdminNameChanged));

        protected static void OnAdminNameChanged(DependencyObject o, DependencyPropertyChangedEventArgs e)
        {
            ((UserTree)o).OnAdminNameChanged((string)e.OldValue, (string)e.NewValue);
        }

        protected void OnAdminNameChanged(string oldValue, string newValue)
        {
            if (oldValue != newValue)
                BeginDownload();
        }

        #endregion

        #region Root

        protected UserTreeItemModel _Root;
        public UserTreeItemModel Root
        {
            get { return _Root; }
            set
            {
                if (_Root != value)
                {
                    _Root = value;
                    UpdateVisibleItems();
                }
            }
        }
        protected Dictionary<int, UserTreeItemModel> _groupDic;
        protected Dictionary<int, UserTreeItemModel> _userDic;

        #endregion

        #region ItemsControl

        protected ScrollViewer _scrollViewer;
        protected bool _itemsControlUpdated;

        protected ItemsControl _itemsControl;
        protected ItemsControl itemsControl
        {
            get { return _itemsControl; }
            set
            {
                if (_itemsControl != null)
                {
                    _itemsControl.LayoutUpdated -= itemsControl_1stTime_LayoutUpdated;
                }

                _itemsControl = value;

                if (_itemsControl != null)
                {
                    _itemsControl.LayoutUpdated += new EventHandler(itemsControl_1stTime_LayoutUpdated);
                }
            }
        }

        /// <summary>
        /// 必ずItemsControlが1回更新してからUserInfoを表示させる。
        /// でなければ、スクロールバーが効かない。第1階層にItemsが多いと表示に時間がかかる。
        /// </summary>
        /// <param name="sender"></param>
        /// <param name="e"></param>
        void itemsControl_1stTime_LayoutUpdated(object sender, EventArgs e)
        {
            _itemsControl.LayoutUpdated -= itemsControl_1stTime_LayoutUpdated;

            _scrollViewer = (ScrollViewer)VisualTreeHelper.GetChild(_itemsControl, 0);
            _itemsControlUpdated = true;

            BeginDownload();
        }

        #endregion

        #region Expand

        protected void UpdateVisibleItems()
        {
            if (itemsControl == null)
                return;

            itemsControl.ItemsSource = InitModels(Root);
        }

        protected UserTreeItemModel[] InitModels(UserTreeItemModel hrchModelRoot)
        {
            if (hrchModelRoot == null)
                return null;

            UserTreeItemModel.IsGroupCheckable = (UserInfoType == UserTypeEnum.Log);
            UserTreeItemModel.UserChecked = UserTreeItemModel_UserChecked;
            UserTreeItemModel.GroupChecked = UserTreeItemModel_GroupChecked;
            UserTreeItemModel.ExpandChecked = UserTreeItemModel_ExpandChecked;

            List<UserTreeItemModel> list = new List<UserTreeItemModel>();

            BeginCalcCheckedItemRow();
            AddSelfAndVisbChildren(hrchModelRoot, list);

            return list.ToArray();
        }

        protected void AddSelfAndVisbChildren(UserTreeItemModel model, List<UserTreeItemModel> list)
        {
            list.Add(model);

            CalcCheckedItemRow(model);

            if (model.IsGroup && model.IsExpanded && model.Children != null)
            {
                foreach (UserTreeItemModel child in model.Children)
                {
                    AddSelfAndVisbChildren(child, list);
                }
            }
        }

        #endregion

        #region CheckedItemRow

        protected int _checkedItemRow = 0;
        protected bool _isCheckedItemHit = false;

        protected void BeginCalcCheckedItemRow()
        {
            _checkedItemRow = 0;
            _isCheckedItemHit = false;
        }

        protected void CalcCheckedItemRow(UserTreeItemModel model)
        {
            if (!_isCheckedItemHit)
            {
                if (model.IsGroup)
                {
                    if (model.IsGroupChecked == true)
                        _isCheckedItemHit = true;
                    else
                        _checkedItemRow++;
                }
                else
                {
                    if (model.IsUserChecked == true)
                        _isCheckedItemHit = true;
                    else
                        _checkedItemRow++;
                }
            }
        }

        #endregion

        #region Check

        protected void UserTreeItemModel_ExpandChecked(UserTreeItemModel model)
        {
            UpdateVisibleItems();
        }

        protected void UserTreeItemModel_UserChecked(UserTreeItemModel model)
        {
            Debug.Assert(model != null);

            if (CheckedItem != model)
            {
                ClearOldCheck();

                OnCheckChanged(model.ID, new int[] { model.ID }, model);
            }
        }

        private void OnCheckChanged(int uid, int[] uids, UserTreeItemModel model)
        {
            Debug.Assert(CheckedItem != model, "CheckedItem != model");

            CheckedUserID = uid;
            CheckedUserIDs = uids;
            CheckedItem = model;

            if (UserChanged != null)
                UserChanged(this, EventArgs.Empty);
        }

        protected void UserTreeItemModel_GroupChecked(UserTreeItemModel model)
        {
            Debug.Assert(model != null);

            if (CheckedItem != model)
            {
                ClearOldCheck();

                int[] uids = null;
                if (model.Children != null)
                    uids = (from c in model.Children
                            where c.IsGroup == false
                            select c.ID).ToArray();

                OnCheckChanged(INVALID_USER_ID, uids, model);
            }
        }

        /// <summary>
        /// 同じグループのRadioButtonを使っているので本来クリアは自動的にできる。
        /// しかし、先にチェックされたRadioButtonが見えなければ、チェック状態が残る。
        /// 自動クリアの条件は、すべでのRadioButtonがVisualTreeに存在するのではないか。
        /// </summary>
        private void ClearOldCheck()
        {
            if (CheckedItem != null)
            {
                if (CheckedItem.IsGroup)
                    CheckedItem.IsGroupChecked = false;
                else
                    CheckedItem.IsUserChecked = false;
            }
        }

        #endregion

        #region BeginDownload

        protected void BeginDownload()
        {
            if (!_itemsControlUpdated)
                return;

            if (string.IsNullOrEmpty(AdminName))
                return;

            ResetTree();

            _waiting.Message = StrRes.MsgDownload;
            _waiting.IsBusy = true;

            ProxyAdapter adp = new ProxyAdapter()
            {
                AdminName = AdminName,
                Type = UserInfoType,
            };

            InvokeBeginDownload(adp, () =>
                {
                    Root = adp.Root;
                    _userDic = adp.UserDic;
                    _groupDic = adp.GroupDic;

                    if (_userDic == null || _userDic.Count == 0)
                        _waiting.Message = StrRes.MsgNoData;
                    else
                        _waiting.IsBusy = false;
                });
        }

        private void ResetTree()
        {
            if (CheckedItem != null)
                OnCheckChanged(INVALID_USER_ID, null, null);

            Root = null;
            UpdateVisibleItems();
        }

        protected void InvokeBeginDownload(ProxyAdapterBase adapter, Action callback)
        {
            Dispatcher.BeginInvoke(() => adapter.BeginDownload(callback, e => OnError(adapter, e)));
        }

        protected void OnError(ProxyAdapterBase adp, Exception err)
        {
            Root = ((ProxyAdapter)adp).Root;
            _userDic = null;
            _groupDic = null;
            _waiting.Message = StrRes.MsgNoData;

            throw new ServerError(err);
        }

        #endregion

        public UserTree()
        {
            this.DefaultStyleKey = typeof(UserTree);

            if (DesignerProperties.IsInDesignTool)
                Root = CreateSampleUser();
            else
                BeginDownload();
        }

        public UserTreeItemModel CreateSampleUser()
        {
            UserTreeItemModel.IsSilent = true;

            UserTreeItemModel root = new UserTreeItemModel { ID = 0, Level = 0, IsGroup = true, Code = "全社員" };
            UserTreeItemModel group1 = new UserTreeItemModel { ID = 1, Level = 1, IsGroup = true, Code = "test1" };
            UserTreeItemModel group1_1 = new UserTreeItemModel { ID = 1, Level = 2, IsGroup = true, Code = "test1.1" };
            UserTreeItemModel group2 = new UserTreeItemModel { ID = 1, Level = 1, IsGroup = true, Code = "削除済み" };

            UserTreeItemModel user1 = new UserTreeItemModel { ID = 1480, Level = 2, Code = "okabe_rie", Name = "岡部　理恵" };
            UserTreeItemModel user1_1 = new UserTreeItemModel { ID = 1481, Level = 3, Code = "kawabuchi_shouta", Name = "川淵　翔太" };

            UserTreeItemModel.IsSilent = false;

            root.Children = new List<UserTreeItemModel> { group1, group2 };
            group1.Children = new List<UserTreeItemModel> { user1, group1_1 };
            group1_1.Children = new List<UserTreeItemModel> { user1_1 };

            return root;
        }

        public override void OnApplyTemplate()
        {
            base.OnApplyTemplate();

            itemsControl = GetTemplateChild("itemsControl") as ItemsControl;
            _waiting = GetTemplateChild("waiting") as WaitingPanel;
        }

        protected WaitingPanel _waiting;
    }
}
