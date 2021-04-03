import React, { memo } from 'react';
import PropTypes from 'prop-types';
import { Progress } from 'antd';

interface IMediaItemProps extends React.PropsWithChildren<any> {
  progress: number;
  name: string;
}

// 选中
const MediaItem = memo((props: IMediaItemProps) => {
  const { progress, name } = props;
  return (
    <li
      style={{
        height: '100px',
        display: 'flex',
        alignItems: 'center',
      }}
    >
      <Progress
        percent={progress}
        type="circle"
        width={80}
        strokeColor={{
          '0%': '#108ee9',
          '100%': '#87d068',
        }}
      />
      <h4 style={{paddingLeft:20}}>{name}</h4>
    </li>
  );
});

MediaItem.displayName = 'MediaItem';

export default MediaItem;
