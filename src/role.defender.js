var RolePrototype = require("./role.prototype");
const MainUtil = require("./main.util");
const info = require("./main.info");

class Defender extends RolePrototype {
  constructor() {
    // Give it a distinctive name, color, and symbol (here a crossed sword)
    super("Defender", "#ff5555", "⚔");
    this.priority = 20; // High priority for defense roles
    this._targetMode = RolePrototype.TARGET_MODE_USE_IF_VALID;
  }

  /**
   * Override spawnCreep to build an attacker with extra toughness.
   */
  spawnCreep(spawn) {
    // This spawns a creep with two extra TOUGH parts (non-replicated) and replicates the ATTACK and MOVE parts.
    return this._spawnCreepWithParts(spawn, [ATTACK, MOVE], [TOUGH, TOUGH]);
  }

  /**
   * Find hostile creeps in the room to attack.
   *
   * @param {Room} room
   * @returns {Array} array of hostile creep objects
   */
  _findTargets(room) {
    // This role focuses on hostile creeps (which are typically invaders in an invaded room)
    return room.find(FIND_HOSTILE_CREEPS);
  }

  /**
   * Perform the attack work. Moves into range if needed.
   *
   * @param {Creep} creep
   */
  _work(creep) {
    let target = this._findClosestTarget(creep);
    if (target) {
      let attackResult = creep.attack(target);
      if (attackResult === ERR_NOT_IN_RANGE) {
        this._moveToLocation(creep, target);
      } else if (attackResult === OK) {
        if (creep.memory.debug) {
          info.log(
            this.symbol +
              " " +
              MainUtil.getDisplayName(creep) +
              " is attacking " +
              MainUtil.getDisplayName(target),
            this._baseRoom
          );
        }
      } else {
        this._handleTargetWorkResult(creep, attackResult);
      }
    } else {
      // If no invaders are present, the creep can signal an idle state.
      creep.say("🛡️ idle");
    }
  }
}

module.exports = Defender;
