/**
 * @typedef {{ x: number, y: number }} Vec2
 * @typedef {{ id: string, width: number, thickness: number, material: string, grain: string, color: string|null, finish: string, edgeProfile: null|object }} StripProperties
 * @typedef {{ jointId: string, position: Vec2, angle: number, depth: number, role: string }} StripCut
 * @typedef {{ id: string, start: Vec2, end: Vec2, orientation: number, cuts: StripCut[] }} Strip
 * @typedef {{ stripId: string, role: string }} JointMember
 * @typedef {{ id: string, position: Vec2, members: JointMember[], notchType: string }} Joint
 * @typedef {{ id: string, stripPropertyId: string, stripId: string, cuts: object[] }} PieceTemplate
 * @typedef {{ id: string, name: string, readOnly: boolean, version: number, sideLength: number, vertices: {A:Vec2,B:Vec2,C:Vec2}, centroid: Vec2, patternParams: object, stripProperties: StripProperties[], strips: Strip[], joints: Joint[], pieceTemplates: PieceTemplate[], meta: object }} TrianglePattern
 */
export {};
