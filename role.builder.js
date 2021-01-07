/*
 * Builder create buildings. 
 */
 
var RolePrototype = require('role.prototype');
 
var result = Object.create(RolePrototype);
result.roleName = 'Builder';
result.requiredNumber = 1;
result.color = '#ffff00';
result.symbol = '🔨';
result.work = creep => result.commuteBetweenSourceAndTarget(creep, target => creep.build(target));
    
result.findTargets = function(room) {
    return room.find(FIND_CONSTRUCTION_SITES);
};

module.exports = result;