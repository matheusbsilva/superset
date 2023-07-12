/**
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
import React from 'react';
import copyTextToClipboard from 'src/utils/copy';
import { t, logging, QueryObjectFilterClause  } from '@superset-ui/core';
import { Menu } from 'src/components/Menu';
import { getDashboardPermalink, getGuestToken } from 'src/utils/urlUtils';
import { RootState } from 'src/dashboard/types';
import { useSelector } from 'react-redux';

interface ShareMenuItemProps {
  url?: string;
  copyMenuItemTitle: string;
  copyPublicLinkTitle: string;
  emailMenuItemTitle: string;
  emailSubject: string;
  emailBody: string;
  addDangerToast: Function;
  addSuccessToast: Function;
  dashboardId: string | number;
  dashboardComponentId?: string;
}

const ShareMenuItems = (props: ShareMenuItemProps) => {
  const {
    copyMenuItemTitle,
    copyPublicLinkTitle,
    emailMenuItemTitle,
    emailSubject,
    emailBody,
    addDangerToast,
    addSuccessToast,
    dashboardId,
    dashboardComponentId,
    ...rest
  } = props;
  const { dataMask, activeTabs } = useSelector((state: RootState) => ({
    dataMask: state.dataMask,
    activeTabs: state.dashboardState.activeTabs,
  }));

  async function generateUrl() {
    return getDashboardPermalink({
      dashboardId,
      dataMask,
      activeTabs,
      anchor: dashboardComponentId,
    });
  }

  async function onCopyLink() {
    try {
      await copyTextToClipboard(generateUrl);
      addSuccessToast(t('Copied to clipboard!'));
    } catch (error) {
      logging.error(error);
      addDangerToast(t('Sorry, something went wrong. Try again later.'));
    }
  }

  async function onShareByEmail() {
    try {
      const encodedBody = encodeURIComponent(
        `${emailBody}${await generateUrl()}`,
      );
      const encodedSubject = encodeURIComponent(emailSubject);
      window.location.href = `mailto:?Subject=${encodedSubject}%20&Body=${encodedBody}`;
    } catch (error) {
      logging.error(error);
      addDangerToast(t('Sorry, something went wrong. Try again later.'));
    }
  }

  function formatFilter(filter: QueryObjectFilterClause) {
    let value: string;

    if (Array.isArray(filter.val)) {
      value = `(${filter.val.map(val => `'${val}'`).join(',')})`;
    } else {
      value = `'${filter.val}'`;
    }

    return `${filter.col} ${filter.op} ${value}`;
  }

  async function generatePublicUrl() {
    const filters = Object.entries(dataMask);
    const cls = filters.flatMap(([, value]) =>
      value.extraFormData?.filters?.map(filter => formatFilter(filter)),
    );
    const rls = cls
      .filter(item => item !== undefined)
      .map(clause => ({ clause }));
    const user = { username: 'guest', first_name: 'guest' };
    const resources = [{ id: dashboardId.toString(), type: 'dashboard' }];
    const uiConfig = 1;
    const standalone = true;

    return getGuestToken({ user, resources, rls }).then(token => {
      const urlParams = `uiConfig=${uiConfig}&standalone=${standalone}&guest_token=${token}`;

      return `${window.location.origin}/dashboard/${dashboardId}/public?${urlParams}`;
    });
  }

  async function onSharePublic() {
    try {
      copyTextToClipboard(generatePublicUrl);
      addSuccessToast(t('Copied to clipboard!'));
    } catch (error) {
      logging.error(error);
      addDangerToast(t('Sorry, something went wrong. Try again later.'));
    }
  }

  return (
    <Menu selectable={false}>
      <Menu.Item key="copy-public-url" {...rest}>
        <div onClick={onSharePublic} role="button" tabIndex={0}>
          {copyPublicLinkTitle}
        </div>
      </Menu.Item>
      <Menu.Item key="copy-url" {...rest}>
        <div onClick={onCopyLink} role="button" tabIndex={0}>
          {copyMenuItemTitle}
        </div>
      </Menu.Item>
      <Menu.Item key="share-by-email" {...rest}>
        <div onClick={onShareByEmail} role="button" tabIndex={0}>
          {emailMenuItemTitle}
        </div>
      </Menu.Item>
    </Menu>
  );
};

export default ShareMenuItems;
