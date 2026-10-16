import { expect, test } from '@playwright/test';

const businessId = 'XBIS12345678901';
const nino = 'AB123456C';

test('shows quarterly obligation states and returns to the selected business', async ({ page }) => {
  await page.route('**/api/hmrc/userRestrictedAuth/businessDetails', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        businessId,
        typeOfBusiness: 'self-employment',
        tradingType: 'self-employed',
        tradingName: 'Example Design',
        accountingPeriods: [{ start: '2018-04-06', end: '2019-04-05' }],
        commencementDate: '2018-04-06',
        businessAddressLineOne: '1 Example Street'
      })
    });
  });

  await page.route('**/api/hmrc/userRestrictedAuth/obligations/quarterly', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        obligations: [{
          typeOfBusiness: 'self-employment',
          businessId,
          obligationDetails: [
            {
              periodStartDate: '2018-04-06',
              periodEndDate: '2018-07-05',
              dueDate: '2018-08-05',
              receivedDate: '2018-08-01',
              status: 'fulfilled'
            },
            {
              periodStartDate: '2018-07-06',
              periodEndDate: '2018-10-05',
              dueDate: '2018-11-05',
              status: 'open'
            }
          ]
        }]
      })
    });
  });

  await page.route('**/api/hmrc/userRestrictedAuth/obligations/yearEnd', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ obligations: [] })
    });
  });

  await page.goto(`/account/business-overview?nino=${nino}&businessId=${businessId}&businessName=Example%20Design`);

  await expect(page.getByRole('heading', { name: 'Business Overview' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Business Details' })).toBeVisible();
  await expect(page.getByText('Fulfilled on 1st August 2018')).toBeVisible();

  await page.getByRole('link', { name: 'Go To Quarterly updates' }).click();
  await expect(page).toHaveURL(/\/account\/quarterly\?/);
  await expect(page).toHaveURL(new RegExp(`businessId=${businessId}`));
  await expect(page).toHaveURL(new RegExp(`startDate=2018-07-06`));

  await page.getByRole('link', { name: 'Business Overview' }).click();
  await expect(page).toHaveURL(new RegExp(`businessId=${businessId}`));
  await expect(page.getByRole('heading', { name: 'Business Details' })).toBeVisible();
  await expect(page.getByText('Example Design', { exact: true })).toBeVisible();
});