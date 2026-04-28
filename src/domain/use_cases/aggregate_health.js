/**
 * aggregateHealth — fetch health for all organs known to the client in parallel.
 *
 * Individual organ failures do NOT fail the whole call; each failing
 * organ becomes an OrganStatus with status "down".
 */

const { OrganStatus } = require("../entities/organ_status");

function portFromUrl(url) {
  const m = (url || "").match(/:(\d+)/);
  return m ? parseInt(m[1]) : 0;
}

/**
 * @param {object} deps
 * @param {import('../repositories/i_organ_client').IOrganClient} deps.organClient
 * @returns {Promise<Record<string, OrganStatus>>}
 */
async function aggregateHealth({ organClient }) {
  if (!organClient) throw new Error("aggregateHealth requires organClient");
  const organs = organClient.list();
  if (!Array.isArray(organs) || organs.length === 0) return {};

  const results = await Promise.all(
    organs.map(async (organ) => {
      try {
        const status = await organClient.health(organ);
        return [organ, status];
      } catch (err) {
        const url = (organClient.urls && organClient.urls[organ]) || "";
        return [organ, OrganStatus.down(organ, portFromUrl(url), err.message || err)];
      }
    })
  );

  return Object.fromEntries(results);
}

module.exports = { aggregateHealth };
