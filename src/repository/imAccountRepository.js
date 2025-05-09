const IMAccount = require("../models/imAccount");

const findByOrgId = async (orgId) => {
    return await IMAccount.findOne({
        where: { orgId: orgId },
      });
};

module.exports = {findByOrgId}