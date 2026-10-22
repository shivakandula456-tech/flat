const SVG_NS = "http://www.w3.org/2000/svg";

const DOOR_OPEN_DIRECTION = {
  "entrance-door": [0, -1],
  "bedroom-door": [1, 0],
  "balcony-door": [0, 1],
};

function svgElement(tag, attributes = {}) {
  const element = document.createElementNS(SVG_NS, tag);
  for (const [name, value] of Object.entries(attributes)) {
    element.setAttribute(name, String(value));
  }
  return element;
}

function normalizeAngle(angle) {
  let value = angle;
  while (value > Math.PI) value -= Math.PI * 2;
  while (value < -Math.PI) value += Math.PI * 2;
  return value;
}

export class FloorPlan {
  constructor(svg, property, options = {}) {
    this.svg = svg;
    this.property = property;
    this.options = options;
    this.roomElements = new Map();
    this.labelElements = new Map();
    this.activeRoomId = null;
    this.render();
  }

  render() {
    this.svg.replaceChildren();
    this.svg.setAttribute("viewBox", "-0.45 -0.45 8.9 6.1");
    this.svg.setAttribute("role", "group");
    this.svg.setAttribute("aria-label", `Interactive schematic floor plan of ${this.property.displayName}`);

    const title = svgElement("title");
    title.textContent = `${this.property.displayName} schematic floor plan`;
    const description = svgElement("desc");
    description.textContent =
      "Select a room to highlight it in the 3D model. The geometry is a provisional reconstruction from the supplied video, not a measured plan.";
    this.svg.append(title, description);

    const defs = svgElement("defs");
    const hatch = svgElement("pattern", {
      id: "plan-grille-hatch",
      width: "0.1",
      height: "0.1",
      patternUnits: "userSpaceOnUse",
      patternTransform: "rotate(45)",
    });
    hatch.append(
      svgElement("line", {
        x1: 0,
        y1: 0,
        x2: 0,
        y2: 0.1,
        stroke: "currentColor",
        "stroke-width": 0.022,
      }),
    );
    defs.appendChild(hatch);
    this.svg.appendChild(defs);

    this.roomsGroup = svgElement("g", { class: "plan-rooms" });
    this.furnitureGroup = svgElement("g", { class: "plan-furniture" });
    this.wallsGroup = svgElement("g", { class: "plan-walls" });
    this.openingsGroup = svgElement("g", { class: "plan-openings" });
    this.labelsGroup = svgElement("g", { class: "plan-labels", "aria-hidden": "true" });
    this.svg.append(
      this.roomsGroup,
      this.furnitureGroup,
      this.wallsGroup,
      this.openingsGroup,
      this.labelsGroup,
    );

    this.renderRooms();
    this.renderFurniture();
    this.renderWalls();
    this.renderLabels();
  }

  renderRooms() {
    for (const room of this.property.layout.rooms) {
      const points = room.polygon.map(([x, z]) => `${x},${z}`).join(" ");
      const polygon = svgElement("polygon", {
        points,
        class: `plan-room plan-room--${room.kind}`,
        "data-room-id": room.id,
        tabindex: "0",
        role: "button",
        "aria-label": `${room.name}. ${room.confidenceLabel}. Select room.`,
      });
      const roomTitle = svgElement("title");
      roomTitle.textContent = `${room.name} — ${room.confidenceLabel}`;
      polygon.appendChild(roomTitle);
      polygon.addEventListener("click", () => {
        this.select(room.id, { notify: true });
      });
      polygon.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          this.select(room.id, { notify: true });
        }
      });
      this.roomElements.set(room.id, polygon);
      this.roomsGroup.appendChild(polygon);
    }
  }

  renderFurniture() {
    for (const item of this.property.layout.furniture) {
      if (!item.plan) continue;
      const group = svgElement("g", {
        class: `plan-object plan-object--${item.type} plan-object--${item.status}`,
        "data-furniture-id": item.id,
      });
      if (item.rotation) {
        group.setAttribute(
          "transform",
          `rotate(${item.rotation} ${item.x} ${item.z})`,
        );
      }
      const x = item.x - item.w / 2;
      const z = item.z - item.d / 2;
      const rect = svgElement("rect", {
        x,
        y: z,
        width: item.w,
        height: item.d,
        rx: item.type === "rug" ? 0.02 : 0.035,
        class: "plan-object__body",
      });
      group.appendChild(rect);

      if (item.type === "daybed") {
        for (let index = 1; index < 3; index += 1) {
          const lineX = x + (item.w / 3) * index;
          group.appendChild(
            svgElement("line", {
              x1: lineX,
              y1: z + 0.04,
              x2: lineX,
              y2: z + item.d - 0.04,
              class: "plan-object__detail",
            }),
          );
        }
      }
      if (item.type === "counter") {
        group.appendChild(
          svgElement("ellipse", {
            cx: item.x,
            cy: z + item.d * 0.28,
            rx: item.w * 0.17,
            ry: item.d * 0.11,
            class: "plan-object__detail",
          }),
        );
      }
      if (item.type === "shelving") {
        for (let index = 1; index < 4; index += 1) {
          group.appendChild(
            svgElement("line", {
              x1: x,
              y1: z + (item.d / 4) * index,
              x2: x + item.w,
              y2: z + (item.d / 4) * index,
              class: "plan-object__detail",
            }),
          );
        }
      }
      if (item.type === "laundry-basin") {
        group.appendChild(
          svgElement("rect", {
            x: x + 0.11,
            y: z + 0.09,
            width: item.w - 0.22,
            height: item.d - 0.18,
            rx: 0.03,
            class: "plan-object__detail",
          }),
        );
      }
      if (item.type === "water-dispenser") {
        group.appendChild(
          svgElement("circle", {
            cx: item.x,
            cy: item.z,
            r: Math.min(item.w, item.d) * 0.25,
            class: "plan-object__detail",
          }),
        );
      }
      if (item.type === "stool" || item.type === "mop") {
        group.appendChild(
          svgElement("circle", {
            cx: item.x,
            cy: item.z,
            r: Math.min(item.w, item.d) * 0.34,
            class: "plan-object__detail",
          }),
        );
      }
      const objectTitle = svgElement("title");
      objectTitle.textContent = `${item.label} — ${item.status}`;
      group.appendChild(objectTitle);
      this.furnitureGroup.appendChild(group);
    }
  }

  renderWalls() {
    for (const wall of this.property.layout.walls) {
      const dx = wall.to[0] - wall.from[0];
      const dz = wall.to[1] - wall.from[1];
      const length = Math.hypot(dx, dz);
      const dirX = dx / length;
      const dirZ = dz / length;
      const horizontal = Math.abs(dirX) > Math.abs(dirZ);
      const openings = [...wall.openings].sort((a, b) => a.offset - b.offset);
      let cursor = 0;

      for (const opening of openings) {
        if (opening.offset > cursor) {
          this.addWallRect(wall, horizontal, cursor, opening.offset);
        }
        this.addOpeningSymbol(wall, opening, horizontal, dirX, dirZ);
        cursor = opening.offset + opening.width;
      }
      if (cursor < length) this.addWallRect(wall, horizontal, cursor, length);
    }
  }

  addWallRect(wall, horizontal, start, end) {
    const thickness = wall.thickness;
    const x = horizontal ? wall.from[0] + start : wall.from[0] - thickness / 2;
    const z = horizontal ? wall.from[1] - thickness / 2 : wall.from[1] + start;
    const width = horizontal ? end - start : thickness;
    const height = horizontal ? thickness : end - start;
    this.wallsGroup.appendChild(
      svgElement("rect", {
        x,
        y: z,
        width,
        height,
        class: `plan-wall plan-wall--${wall.kind}`,
        "data-wall-id": wall.id,
      }),
    );
  }

  addOpeningSymbol(wall, opening, horizontal, dirX, dirZ) {
    const start = {
      x: wall.from[0] + dirX * opening.offset,
      z: wall.from[1] + dirZ * opening.offset,
    };
    const end = {
      x: wall.from[0] + dirX * (opening.offset + opening.width),
      z: wall.from[1] + dirZ * (opening.offset + opening.width),
    };
    const group = svgElement("g", {
      class: `plan-opening plan-opening--${opening.kind}`,
      "data-opening-id": opening.id,
    });

    const tick = wall.thickness / 2 + 0.07;
    for (const point of [start, end]) {
      if (horizontal) {
        group.appendChild(
          svgElement("line", {
            x1: point.x,
            y1: point.z - tick,
            x2: point.x,
            y2: point.z + tick,
            class: "plan-opening__jamb",
          }),
        );
      } else {
        group.appendChild(
          svgElement("line", {
            x1: point.x - tick,
            y1: point.z,
            x2: point.x + tick,
            y2: point.z,
            class: "plan-opening__jamb",
          }),
        );
      }
    }

    if (opening.kind === "door") {
      this.addDoorSymbol(group, wall, opening, start, end, horizontal);
    }

    if (opening.kind === "window") {
      for (const offset of [-0.055, 0.055]) {
        if (horizontal) {
          group.appendChild(
            svgElement("line", {
              x1: start.x,
              y1: start.z + offset,
              x2: end.x,
              y2: end.z + offset,
              class: "plan-opening__glass",
            }),
          );
        } else {
          group.appendChild(
            svgElement("line", {
              x1: start.x + offset,
              y1: start.z,
              x2: end.x + offset,
              y2: end.z,
              class: "plan-opening__glass",
            }),
          );
        }
      }
    }

    if (opening.kind === "grille") {
      group.appendChild(
        svgElement("line", {
          x1: start.x,
          y1: start.z,
          x2: end.x,
          y2: end.z,
          class: "plan-opening__grille",
        }),
      );
      const back = {
        x: end.x - dirX * (opening.width * 0.5),
        z: end.z - dirZ * (opening.width * 0.5),
      };
      group.appendChild(
        svgElement("line", {
          x1: start.x + dirZ * 0.05,
          y1: start.z - dirX * 0.05,
          x2: back.x + dirZ * 0.05,
          y2: back.z - dirX * 0.05,
          class: "plan-opening__grille",
        }),
      );
    }

    this.openingsGroup.appendChild(group);
  }

  addDoorSymbol(group, wall, opening, start, end, horizontal) {
    if (opening.leaf === "white-closed" || !opening.openAngle) {
      group.appendChild(
        svgElement("line", {
          x1: start.x,
          y1: start.z,
          x2: end.x,
          y2: end.z,
          class: "plan-door plan-door--closed",
        }),
      );
      group.appendChild(
        svgElement("circle", {
          cx: horizontal ? start.x + opening.width * 0.82 : start.x,
          cy: horizontal ? start.z : start.z + opening.width * 0.82,
          r: 0.035,
          class: "plan-door__handle",
        }),
      );
      return;
    }

    const hingeStart = opening.hinge !== "end";
    const hinge = hingeStart ? start : end;
    const other = hingeStart ? end : start;
    let direction = DOOR_OPEN_DIRECTION[opening.id];
    if (!direction) {
      direction = horizontal ? [0, hingeStart ? -1 : 1] : [hingeStart ? -1 : 1, 0];
    }
    const open = {
      x: hinge.x + direction[0] * opening.width,
      z: hinge.z + direction[1] * opening.width,
    };
    group.appendChild(
      svgElement("line", {
        x1: hinge.x,
        y1: hinge.z,
        x2: open.x,
        y2: open.z,
        class: "plan-door plan-door--leaf",
      }),
    );
    const closedAngle = Math.atan2(other.z - hinge.z, other.x - hinge.x);
    const openAngle = Math.atan2(open.z - hinge.z, open.x - hinge.x);
    const delta = normalizeAngle(openAngle - closedAngle);
    const arcPoints = [];
    const steps = 18;
    for (let index = 0; index <= steps; index += 1) {
      const angle = closedAngle + (delta * index) / steps;
      arcPoints.push(
        `${(hinge.x + Math.cos(angle) * opening.width).toFixed(4)},${(
          hinge.z +
          Math.sin(angle) * opening.width
        ).toFixed(4)}`,
      );
    }
    group.appendChild(
      svgElement("polyline", {
        points: arcPoints.join(" "),
        class: "plan-door plan-door--swing",
      }),
    );
    group.appendChild(
      svgElement("circle", {
        cx: hinge.x,
        cy: hinge.z,
        r: 0.035,
        class: "plan-door__hinge",
      }),
    );
  }

  renderLabels() {
    for (const room of this.property.layout.rooms) {
      const [x, z] = room.labelPosition;
      const group = svgElement("g", {
        class: `plan-room-label plan-room-label--${room.kind}`,
        transform: `translate(${x} ${z})`,
        "data-room-id": room.id,
      });
      group.appendChild(
        svgElement("circle", {
          cx: 0,
          cy: 0,
          r: 0.115,
          class: "plan-room-label__disc",
        }),
      );
      const number = svgElement("text", {
        x: 0,
        y: 0.037,
        class: "plan-room-label__number",
        "text-anchor": "middle",
      });
      number.textContent = String(room.index).padStart(2, "0");
      group.appendChild(number);
      const label = svgElement("text", {
        x: 0,
        y: 0.31,
        class: "plan-room-label__name",
        "text-anchor": "middle",
      });
      label.textContent = room.shortName;
      group.appendChild(label);
      this.labelElements.set(room.id, group);
      this.labelsGroup.appendChild(group);
    }
  }

  select(roomId, options = {}) {
    if (roomId === this.activeRoomId && options.force !== true) {
      if (options.notify) this.options.onSelect?.(roomId);
      return;
    }
    this.activeRoomId = roomId;
    for (const [id, element] of this.roomElements) {
      element.classList.toggle("is-active", id === roomId);
      element.setAttribute("aria-pressed", String(id === roomId));
    }
    for (const [id, element] of this.labelElements) {
      element.classList.toggle("is-active", id === roomId);
    }
    if (options.notify) this.options.onSelect?.(roomId);
  }
}
