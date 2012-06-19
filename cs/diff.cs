58,59c58,76
<         public static readonly DependencyProperty CheckedItemProperty =
<             DependencyProperty.Register("CheckedItem", typeof(UserTreeItemModel), typeof(UserTree), new PropertyMetadata(null));
---
>         public static readonly DependencyProperty CheckedItemProperty = 
>             DependencyProperty.Register("CheckedItem", typeof(UserTreeItemModel), typeof(UserTree),
>             new PropertyMetadata(null, OnCheckedItemChanged));
> 
>         protected static void OnCheckedItemChanged(DependencyObject o, DependencyPropertyChangedEventArgs e)
>         {
>             ((UserTree)o).OnCheckedItemChanged((UserTreeItemModel)e.OldValue, (UserTreeItemModel)e.NewValue);
>         }
> 
>         protected void OnCheckedItemChanged(UserTreeItemModel oldValue, UserTreeItemModel newValue)
>         {
>             if (newValue == null)
>                 if (oldValue != null)
>                 {
>                     UserTreeItemModel.IsSilent = true;
>                     oldValue.IsUserChecked = false;
>                     UserTreeItemModel.IsSilent = false;
>                 }
>         }
64a82,95
>         #region IsGroupSelectable
> 
>         public bool? IsGroupSelectable
>         {
>             get { return (bool?)GetValue(IsGroupSelectableProperty); }
>             set { SetValue(IsGroupSelectableProperty, value); }
>         }
> 
>         public static readonly DependencyProperty IsGroupSelectableProperty =
>             DependencyProperty.Register("IsGroupSelectable", typeof(bool?), typeof(UserTree),
>             new PropertyMetadata(null));
> 
>         #endregion
> 
403a435,442
>         private bool GetAdaperIsGroupSelectable()
>         {
>             if (this.IsGroupSelectable == null)
>                 return (UserInfoType == UserTypeEnum.Log);
>             else
>                 return (bool)this.IsGroupSelectable;
>         }
> 
409c448,452
<             UserTreeItemModel.IsGroupCheckable = (UserInfoType == UserTypeEnum.Log);
---
>             //if (this.IsGroupSelectable == null)
>             //    UserTreeItemModel.IsGroupCheckable = (UserInfoType == UserTypeEnum.Log);
>             //else
>             //    UserTreeItemModel.IsGroupCheckable = (bool)this.IsGroupSelectable;
> 
558a602
>                 IsGroupSelectable = GetAdaperIsGroupSelectable(),
