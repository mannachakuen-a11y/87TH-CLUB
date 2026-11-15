#!/usr/bin/env python3
"""Single source of truth for the fictional 87TH CLUB catalogue.

Writes:
  scripts/images.json     -> crop specs consumed by process_images.py
  src/data/catalog.json   -> products / editorial data consumed by the app

Every product image references a verified Unsplash photo id; the photo was
checked by eye to show the garment named in the product title.
"""
import json, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

TOPS = ['XS', 'S', 'M', 'L', 'XL', 'XXL']
WAIST = ['28', '30', '32', '34', '36', '38']
OS = ['ONE SIZE']

# family -> shared copy
FAMILIES = {
    'heavyweight-tee': dict(name='Heavyweight Blank Tee', category='tees', price=45, sizes=TOPS,
        desc='Boxy short-sleeve tee cut from 8 oz combed cotton jersey. No graphics, ribbed collar, dropped shoulder.',
        details=['8 oz combed cotton jersey', 'Ribbed crew neck', 'Boxy fit with dropped shoulder', 'Side-seam construction', 'Unisex', 'Material: 100% cotton', 'Made in Portugal']),
    'circle-print-tee': dict(name='Circle Print Tee', category='tees', price=50, sizes=TOPS,
        desc='Short-sleeve tee with a small circular print at the chest and an oversized version across the back.',
        details=['Screen-printed chest and back graphic', '6.5 oz cotton jersey', 'Regular fit', 'Unisex', 'Material: 100% cotton', 'Imported']),
    'graphic-tee': dict(name='Graphic Printed T-Shirt', category='tees', price=50, sizes=TOPS,
        desc='Short-sleeve tee with a large framed graphic printed on the front in two colours.',
        details=['Two-colour front screen print', 'Woven label at hem', '6.5 oz cotton jersey', 'Regular fit', 'Unisex', 'Material: 100% cotton', 'Imported']),
    'hand-sign-tee': dict(name='Hand Sign Graphic Tee', category='tees', price=48, sizes=TOPS,
        desc='Short-sleeve tee with a hand-drawn skeletal hand graphic printed across the chest.',
        details=['Front screen print', 'Garment washed for a soft hand', '6.5 oz cotton jersey', 'Relaxed fit', 'Unisex', 'Material: 100% cotton', 'Imported']),
    'lighthouse-tee': dict(name='Lighthouse Back Print Tee', category='tees', price=48, sizes=TOPS,
        desc='Short-sleeve tee with a fine-line coastal lighthouse illustration printed on the back.',
        details=['Back screen print', '6.5 oz cotton jersey', 'Regular fit', 'Unisex', 'Material: 100% cotton', 'Imported']),
    'script-tee': dict(name='Spaced Lettering Tee', category='tees', price=45, sizes=TOPS,
        desc='Short-sleeve tee with widely spaced white lettering printed across the chest.',
        details=['Front screen print', '6.5 oz cotton jersey', 'Regular fit', 'Unisex', 'Material: 100% cotton', 'Imported']),
    'pigment-tee': dict(name='Pigment Dyed Tee', category='tees', price=50, sizes=TOPS,
        desc='Short-sleeve tee pigment dyed after construction for a faded, lived-in colour. Small tonal chest print.',
        details=['Pigment garment dye', 'Small chest print', '7 oz cotton jersey', 'Regular fit', 'Unisex', 'Material: 100% cotton', 'Imported']),
    'piped-tee': dict(name='Contrast Piping Tee', category='tees', price=55, sizes=TOPS,
        desc='Short-sleeve tee with contrast piping along the raglan seams and collar.',
        details=['Contrast piping at seams', 'Heavyweight cotton jersey', 'Relaxed fit', 'Unisex', 'Material: 100% cotton', 'Imported']),
    'heart-tee': dict(name='Heart Patch Tee', category='tees', price=48, sizes=TOPS,
        desc='Short-sleeve tee with a small broken-heart print at the chest.',
        details=['Chest print', '6.5 oz cotton jersey', 'Regular fit', 'Unisex', 'Material: 100% cotton', 'Imported']),
    'heavyweight-hoodie': dict(name='Heavyweight Hoodie', category='sweats', price=140, sizes=TOPS,
        desc='Pullover hooded sweatshirt in 14 oz brushed-back fleece with a kangaroo pocket.',
        details=['14 oz brushed-back cotton fleece', 'Double-layer hood with drawcords', 'Kangaroo pocket', 'Rib-knit cuffs and hem', 'Unisex', 'Material: 80% cotton / 20% polyester', 'Imported']),
    'oversized-hoodie': dict(name='Oversized Hoodie', category='sweats', price=145, sizes=TOPS,
        desc='Pullover hooded sweatshirt cut wide through the body with dropped shoulders. No drawcords.',
        details=['12 oz cotton fleece', 'Oversized fit', 'Kangaroo pocket', 'Rib-knit cuffs and hem', 'Unisex', 'Material: 100% cotton', 'Imported']),
    'skull-hoodie': dict(name='Skull Back Print Hoodie', category='sweats', price=150, sizes=TOPS,
        desc='Pullover hooded sweatshirt with a large skull-and-rose graphic printed on the back.',
        details=['Back screen print', '14 oz cotton fleece', 'Double-layer hood', 'Kangaroo pocket', 'Unisex', 'Material: 80% cotton / 20% polyester', 'Imported']),
    'crew-sweat': dict(name='Crewneck Sweatshirt', category='sweats', price=120, sizes=TOPS,
        desc='Crewneck sweatshirt in midweight loopback fleece with ribbed trims.',
        details=['12 oz loopback cotton fleece', 'Ribbed collar, cuffs and hem', 'Regular fit', 'Unisex', 'Material: 100% cotton', 'Imported']),
    'fleece-pant': dict(name='Fleece Sweatpant', category='sweats', price=120, sizes=TOPS,
        desc='Straight-leg sweatpant in brushed-back fleece with an elasticated drawcord waist.',
        details=['14 oz brushed-back fleece', 'Elastic waist with drawcord', 'Side seam pockets', 'Straight leg, open hem', 'Unisex', 'Material: 80% cotton / 20% polyester', 'Imported']),
    'puffer-jacket': dict(name='Quilted Puffer Jacket', category='outerwear', price=325, sizes=TOPS,
        desc='Down-filled puffer jacket with box-quilted baffles, stand collar and stowaway hood.',
        details=['Water-repellent nylon shell', '650-fill down insulation', 'Two-way zip front', 'Stand collar with stowaway hood', 'Zip hand pockets', 'Unisex', 'Fill: 90% down / 10% feathers', 'Imported']),
    'bomber-jacket': dict(name='Satin Bomber Jacket', category='outerwear', price=245, sizes=TOPS,
        desc='Classic bomber jacket in lightweight satin with rib-knit collar, cuffs and hem.',
        details=['Satin nylon shell', 'Quilted lining', 'Rib-knit trims', 'Zip front', 'Utility sleeve pocket', 'Unisex', 'Material: 100% nylon', 'Imported']),
    'moto-jacket': dict(name='Leather Moto Jacket', category='outerwear', price=495, sizes=TOPS,
        desc='Asymmetric-zip motorcycle jacket in waxed lambskin with notched lapels and a belted hem.',
        details=['Waxed lambskin leather', 'Asymmetric zip closure', 'Notched lapels with snaps', 'Zip cuffs', 'Belted hem', 'Unisex', 'Material: 100% leather', 'Imported']),
    'rider-jacket': dict(name='Leather Rider Jacket', category='outerwear', price=465, sizes=TOPS,
        desc='Café racer style jacket in soft-hand brown leather with a band collar.',
        details=['Soft-hand cowhide', 'Band collar with snap tab', 'Zip front', 'Zip hand pockets', 'Unisex', 'Material: 100% leather', 'Imported']),
    'field-jacket': dict(name='Utility Field Jacket', category='outerwear', price=225, sizes=TOPS,
        desc='Four-pocket field jacket in garment-washed cotton twill with a drawcord waist.',
        details=['Washed cotton twill', 'Four bellows pockets', 'Concealed snap placket', 'Internal drawcord waist', 'Unisex', 'Material: 100% cotton', 'Imported']),
    'trucker-jacket': dict(name='Denim Trucker Jacket', category='denim', price=195, sizes=TOPS,
        desc='Rigid denim trucker jacket with a corduroy collar and contrast stitching.',
        details=['13.5 oz rigid denim', 'Corduroy collar', 'Button-flap chest pockets', 'Adjustable waist tabs', 'Unisex', 'Material: 100% cotton', 'Imported']),
    'sherpa-trucker': dict(name='Sherpa Lined Denim Jacket', category='denim', price=225, sizes=TOPS,
        desc='Dark wash denim jacket lined in warm sherpa fleece through the body and collar.',
        details=['12 oz denim', 'Sherpa fleece lining and collar', 'Button front', 'Chest and hand pockets', 'Unisex', 'Material: 100% cotton / Lining: 100% polyester', 'Imported']),
    'washed-trucker': dict(name='Washed Denim Jacket', category='denim', price=185, sizes=TOPS,
        desc='Light stonewash denim jacket with a relaxed, slightly cropped body.',
        details=['12 oz stonewashed denim', 'Button front', 'Button-flap chest pockets', 'Relaxed fit', 'Unisex', 'Material: 100% cotton', 'Imported']),
    'suede-overshirt': dict(name='Suede Overshirt', category='tops-shirts', price=295, sizes=TOPS,
        desc='Button-front overshirt in brushed goat suede with two chest pockets. Layers over tees and knits.',
        details=['Brushed goat suede', 'Snap front', 'Two chest pockets', 'Unlined', 'Unisex', 'Material: 100% leather', 'Imported']),
    'flannel-shirt': dict(name='Flannel Shirt', category='tops-shirts', price=110, sizes=TOPS,
        desc='Long-sleeve button-front shirt in brushed cotton flannel with a buffalo or tartan plaid.',
        details=['Brushed cotton flannel', 'Button front', 'Two flap chest pockets', 'Curved hem', 'Unisex', 'Material: 100% cotton', 'Imported']),
    'dot-shirt': dict(name='Chambray Dot Shirt', category='tops-shirts', price=98, sizes=TOPS,
        desc='Long-sleeve chambray shirt with a small discharge-printed dot pattern.',
        details=['Lightweight cotton chambray', 'All-over dot print', 'Button front', 'Single chest pocket', 'Unisex', 'Material: 100% cotton', 'Imported']),
    'oxford-shirt': dict(name='Oxford Shirt', category='tops-shirts', price=95, sizes=TOPS,
        desc='Long-sleeve shirt in washed cotton oxford cloth with a point collar.',
        details=['Washed cotton oxford', 'Point collar', 'Button front', 'Curved hem', 'Unisex', 'Material: 100% cotton', 'Imported']),
    'chunky-knit': dict(name='Chunky Knit Sweater', category='knits', price=165, sizes=TOPS,
        desc='Crewneck sweater in a thick textured stitch. Slightly cropped with a relaxed sleeve.',
        details=['5 gauge textured knit', 'Crew neck', 'Ribbed trims', 'Relaxed fit', 'Unisex', 'Material: 70% wool / 30% nylon', 'Imported']),
    'fair-isle-knit': dict(name='Fair Isle Knit Sweater', category='knits', price=185, sizes=TOPS,
        desc='Crewneck sweater with a multi-colour Fair Isle pattern knitted through the body and sleeves.',
        details=['Jacquard Fair Isle knit', 'Crew neck', 'Ribbed trims', 'Regular fit', 'Unisex', 'Material: 100% lambswool', 'Imported']),
    'cable-cardigan': dict(name='Oversized Chunky Knit Sweater', category='knits', price=175, sizes=TOPS,
        desc='Long, slouchy sweater in a chunky knit with a high neck and extra-long sleeves.',
        details=['Chunky knit', 'High neck', 'Dropped shoulder', 'Oversized fit', 'Unisex', 'Material: 60% cotton / 40% acrylic', 'Imported']),
    'straight-jean': dict(name='Straight Leg Jeans', category='denim', price=150, sizes=WAIST,
        desc='Five-pocket jean with a mid rise and straight leg in rinsed selvedge denim.',
        details=['13.5 oz selvedge denim', 'Five-pocket styling', 'Button fly', 'Straight leg', 'Unisex', 'Material: 100% cotton', 'Imported']),
    'slim-jean': dict(name='Slim Tapered Jeans', category='denim', price=150, sizes=WAIST,
        desc='Five-pocket jean with a slim thigh and a tapered leg in a faded mid wash.',
        details=['12 oz stretch denim', 'Five-pocket styling', 'Zip fly', 'Slim tapered fit', 'Unisex', 'Material: 100% cotton', 'Imported']),
    'distressed-jean': dict(name='Distressed Jeans', category='denim', price=165, sizes=WAIST,
        desc='Light wash slim jean with hand-finished rips and abrasion at the knees.',
        details=['12 oz stretch denim', 'Hand-finished distressing', 'Five-pocket styling', 'Slim fit', 'Unisex', 'Material: 98% cotton / 2% elastane', 'Imported']),
    'pleated-trouser': dict(name='Wide Leg Pleated Trouser', category='bottoms', price=135, sizes=WAIST,
        desc='High-rise trouser with front pleats and a wide, full-length leg.',
        details=['Cotton twill', 'Double front pleats', 'Slant pockets', 'Wide leg', 'Unisex', 'Material: 100% cotton', 'Imported']),
    'stripe-short': dict(name='Striped Pull-On Short', category='bottoms', price=85, sizes=TOPS,
        desc='Pull-on short in a fine grey and white cotton stripe with a tie waist and relaxed leg.',
        details=['Yarn-dyed cotton stripe', 'Elastic waist with tie', 'Side seam pockets', 'Relaxed leg', 'Unisex', 'Material: 100% cotton', 'Imported']),
    'twill-cap': dict(name='Washed Twill Cap', category='headwear', price=45, sizes=OS,
        desc='Six-panel low profile cap in garment-washed cotton twill with a curved brim.',
        details=['Garment-washed cotton twill', 'Six panel, unstructured crown', 'Curved brim', 'Adjustable strapback', 'Material: 100% cotton', 'Imported']),
    'trucker-cap': dict(name='Mesh Trucker Cap', category='headwear', price=42, sizes=OS,
        desc='Five-panel trucker cap with a foam front, mesh back panels and snapback closure.',
        details=['Foam front panel', 'Mesh back panels', 'Snapback closure', 'Material: 100% polyester', 'Imported']),
    'embroidered-cap': dict(name='Embroidered Cap', category='headwear', price=48, sizes=OS,
        desc='Six-panel cap in cotton twill with a melting ice cream cone embroidered on the front.',
        details=['Cotton twill', 'Front embroidery', 'Curved brim', 'Adjustable strapback', 'Material: 100% cotton', 'Imported']),
    'ribbed-beanie': dict(name='Ribbed Beanie', category='beanies', price=40, sizes=OS,
        desc='Slouchy rib-knit beanie in a soft wool blend. Wear it slouched or folded.',
        details=['Rib knit', 'Slouch fit', 'Material: 50% wool / 50% acrylic', 'Imported']),
    'cuff-beanie': dict(name='Ribbed Cuff Beanie', category='beanies', price=38, sizes=OS,
        desc='Classic rib-knit beanie with a deep fold-over cuff and small woven tab.',
        details=['Rib knit', 'Fold-over cuff', 'Woven tab label', 'Material: 100% acrylic', 'Imported']),
    'wool-beanie': dict(name='Wool Watch Cap', category='beanies', price=45, sizes=OS,
        desc='Fine-gauge merino watch cap with a shallow cuff.',
        details=['Fine-gauge knit', 'Shallow cuff', 'Material: 100% merino wool', 'Imported']),
    'round-sunglasses': dict(name='Round Metal Sunglasses', category='sunglasses', price=150, sizes=OS,
        desc='Round sunglasses with a thin metal frame, keyhole bridge and tinted lenses.',
        details=['Metal frame', 'Adjustable nose pads', 'Tinted CR-39 lenses, 100% UV protection', 'Includes case and cloth', 'Imported']),
    'cat-eye-sunglasses': dict(name='Cat Eye Sunglasses', category='sunglasses', price=165, sizes=OS,
        desc='Oversized cat-eye sunglasses with a slim metal frame and gradient lenses.',
        details=['Metal frame', 'Gradient lenses, 100% UV protection', 'Includes case and cloth', 'Imported']),
    'acetate-sunglasses': dict(name='Acetate Sunglasses', category='sunglasses', price=155, sizes=OS,
        desc='Rounded panto sunglasses in clear acetate with warm brown lenses.',
        details=['Hand-polished acetate frame', 'Brown lenses, 100% UV protection', 'Includes case and cloth', 'Imported']),
    'canvas-backpack': dict(name='Canvas Backpack', category='accessories', price=110, sizes=OS,
        desc='Everyday zip-top backpack in waxed canvas with a padded laptop sleeve.',
        details=['Waxed cotton canvas', 'Padded 15" laptop sleeve', 'Front zip pocket', 'Padded shoulder straps', 'Imported']),
    'leather-backpack': dict(name='Leather Backpack', category='accessories', price=265, sizes=OS,
        desc='Rounded zip-top backpack in vegetable-tanned leather with a front pocket.',
        details=['Vegetable-tanned leather', 'Zip main compartment', 'Front zip pocket', 'Adjustable straps', 'Imported']),
    'bifold-wallet': dict(name='Leather Bifold Wallet', category='accessories', price=85, sizes=OS,
        desc='Slim bifold wallet in full-grain leather that darkens with wear.',
        details=['Full-grain leather', 'Six card slots', 'Full-length bill compartment', 'Imported']),
    'crossbody-bag': dict(name='Leather Crossbody Bag', category='accessories', price=145, sizes=OS,
        desc='Small structured crossbody bag in smooth leather with an adjustable strap.',
        details=['Smooth leather', 'Magnetic flap closure', 'Adjustable strap', 'Imported']),
}

# (family, colour, colour group, photo specs [main, alt], new arrival?)
# photo spec: (unsplash id, fx, fy, zoom, extra)
def P(src, fx=0.5, fy=0.5, zoom=1.0, **kw):
    return dict(src=src, fx=fx, fy=fy, zoom=zoom, **kw)

PRODUCTS = [
    ('puffer-jacket', 'Black', 'Black', [P('1605908502724-9093a79a1b39', .5, .62, 1.0, subject='Model wearing a black quilted down puffer jacket'), P('1548126032-079a0fb0099d', .5, .45, 1.0, subject='Man wearing a black quilted jacket over a red hoodie')], True),
    ('bomber-jacket', 'Rust', 'Orange', [P('1591047139829-d91aecb6caea', .5, .5, 1.0, subject='Rust satin bomber jacket on a hanger'), P('1591047139829-d91aecb6caea', .5, .55, 1.9, subject='Rust satin bomber jacket - detail crop of zip and rib collar')], True),
    ('heavyweight-hoodie', 'Grey Heather', 'Grey', [P('1556821840-3a63f95609a7', .5, .55, 1.0, subject='Person wearing a grey heather pullover hoodie, back view'), P('1556821840-3a63f95609a7', .5, .45, 1.8, subject='Grey pullover hoodie - detail crop of hood')], True),
    ('ribbed-beanie', 'Forest', 'Green', [P('1510598969022-c4c6c5d05769', .45, .3, 1.15, subject='Person wearing a forest green slouchy rib-knit beanie'), P('1510598969022-c4c6c5d05769', .45, .22, 2.0, subject='Forest green rib-knit beanie - detail crop')], True),
    ('heavyweight-tee', 'White', 'White', [P('1521572163474-6864f9cf17ab', .5, .5, 1.0, subject='Model wearing a plain white crew neck t-shirt'), P('1586790170083-2f9ceadc732d', .5, .6, 1.0, subject='Man wearing a plain white crew neck t-shirt')], True),
    ('heavyweight-tee', 'Black', 'Black', [P('1618517351616-38fb9c5210c6', .5, .5, 1.0, subject='Man wearing a plain black crew neck t-shirt'), P('1618517351616-38fb9c5210c6', .55, .45, 1.8, subject='Plain black t-shirt - detail crop')], True),
    ('circle-print-tee', 'Black', 'Black', [P('1618354691373-d851c5c3a990', .5, .5, 1.0, mode='pad', subject='Black t-shirt with small circular chest print on a hanger, front'), P('1618354691438-25bc04584c23', .5, .5, 1.0, mode='pad', subject='Same black t-shirt, back view with large circular print')], True),
    ('graphic-tee', 'Natural', 'Natural', [P('1576566588028-4147f3842f27', .5, .5, 1.0, subject='Natural t-shirt with a large blue framed graphic print'), P('1576566588028-4147f3842f27', .5, .45, 1.8, subject='Graphic print t-shirt - detail crop of print')], True),
    ('hand-sign-tee', 'Black', 'Black', [P('1503341504253-dff4815485f1', .5, .45, 1.0, subject='Man wearing a black t-shirt with a skeleton hand graphic'), P('1503342217505-b0a15ec3261c', .47, .5, 1.25, subject='Woman wearing the same black skeleton hand graphic t-shirt')], True),
    ('script-tee', 'Black', 'Black', [P('1583743814966-8936f5b7be1a', .5, .5, 1.0, subject='Black t-shirt with spaced white chest lettering on a hanger'), P('1583744946564-b52ac1c389c8', .5, .4, 1.0, subject='Woman wearing the same black lettering t-shirt')], True),
    ('flannel-shirt', 'Black Plaid', 'Black', [P('1611312449412-6cefac5dc3e4', .5, .55, 1.0, subject='Black and grey buffalo plaid flannel shirt on a hanger'), P('1611312449412-6cefac5dc3e4', .5, .62, 1.9, subject='Plaid flannel shirt - detail crop of pockets')], True),
    ('flannel-shirt', 'Mustard Plaid', 'Yellow', [P('1607345366928-199ea26cfe3e', .5, .5, 1.0, subject='Man wearing an open mustard plaid flannel shirt'), P('1607345366928-199ea26cfe3e', .5, .55, 1.7, subject='Mustard plaid flannel shirt - detail crop')], True),
    ('trucker-jacket', 'Rigid Indigo', 'Blue', [P('1611312449408-fcece27cdbb7', .5, .5, 1.0, subject='Dark indigo denim trucker jacket with corduroy collar on a hanger'), P('1611312449408-fcece27cdbb7', .5, .45, 1.9, subject='Denim trucker jacket - detail crop of collar and chest pockets')], True),
    ('heavyweight-hoodie', 'Brown', 'Brown', [P('1578768079052-aa76e52ff62e', .5, .5, 1.0, subject='Man wearing a brown pullover hoodie with drawcords'), P('1578768079052-aa76e52ff62e', .5, .4, 1.8, subject='Brown pullover hoodie - detail crop')], True),
    ('twill-cap', 'Charcoal', 'Grey', [P('1521369909029-2afed882baee', .5, .5, 1.0, mode='pad', subject='Washed charcoal cotton twill baseball cap on white'), P('1521369909029-2afed882baee', .45, .5, 1.6, subject='Washed twill cap - detail crop')], True),
    ('moto-jacket', 'Black', 'Black', [P('1551028719-00167b16eac5', .5, .5, 1.0, subject='Black leather motorcycle jacket laid flat'), P('1520975954732-35dd22299614', .5, .45, 1.0, subject='Man wearing a black leather motorcycle jacket')], True),
    ('chunky-knit', 'Oat', 'Natural', [P('1631541909061-71e349d1f203', .5, .5, 1.0, subject='Oat textured knit sweater on a hanger'), P('1624623278313-a930126a11c3', .5, .5, 1.0, subject='Folded cream knit sweaters - texture detail')], True),
    ('straight-jean', 'Black Rinse', 'Black', [P('1624378439575-d8705ad7ae80', .5, .5, 1.0, mode='pad', subject='Dark straight leg jeans laid flat'), P('1624378439575-d8705ad7ae80', .5, .2, 2.0, subject='Straight leg jeans - detail crop of waistband')], True),
    ('oversized-hoodie', 'Pink', 'Pink', [P('1565693413579-8ff3fdc1b03b', .55, .5, 1.0, subject='Woman wearing an oversized pink pullover hoodie'), P('1565693413579-8ff3fdc1b03b', .55, .65, 1.7, subject='Pink oversized hoodie - detail crop')], True),
    ('skull-hoodie', 'Mustard', 'Yellow', [P('1609873814058-a8928924184a', .5, .55, 1.0, subject='Mustard hoodie with skull and rose back print, worn, back view'), P('1609873814058-a8928924184a', .5, .55, 1.8, subject='Skull back print - detail crop')], True),
    ('crew-sweat', 'White', 'White', [P('1620799140408-edc6dcb6d633', .5, .5, 1.15, subject='White crewneck sweatshirt laid flat'), P('1620799140408-edc6dcb6d633', .5, .32, 1.7, subject='White crewneck sweatshirt - detail crop of collar')], True),
    ('crew-sweat', 'Black', 'Black', [P('1614975059251-992f11792b9f', .5, .55, 1.0, subject='Man wearing a black crewneck sweatshirt with small chest print'), P('1614975059251-992f11792b9f', .55, .55, 1.8, subject='Black crewneck sweatshirt - detail crop')], True),
    ('round-sunglasses', 'Gold / Green', 'Gold', [P('1511499767150-a48a237f0083', .5, .5, 1.0, mode='pad', subject='Round gold metal sunglasses with green lenses on white'), P('1511499767150-a48a237f0083', .5, .5, 1.6, subject='Round metal sunglasses - detail crop')], True),
    ('lighthouse-tee', 'White', 'White', [P('1564859228273-274232fdb516', .5, .6, 1.0, subject='Man wearing a white t-shirt with a lighthouse illustration on the back'), P('1564859228273-274232fdb516', .5, .62, 1.8, subject='Lighthouse back print - detail crop')], True),
    ('field-jacket', 'Olive', 'Green', [P('1544022613-e87ca75a784a', .5, .55, 1.0, subject='Woman wearing an olive four-pocket utility field jacket'), P('1544022613-e87ca75a784a', .5, .6, 1.7, subject='Olive field jacket - detail crop of pockets')], True),
    ('fair-isle-knit', 'Multi', 'Multi', [P('1611911813383-67769b37a149', .5, .5, 1.0, mode='pad', subject='Fair Isle patterned knit sweater sleeves'), P('1611911813383-67769b37a149', .4, .5, 1.7, subject='Fair Isle knit - pattern detail')], True),
    ('slim-jean', 'Mid Wash', 'Blue', [P('1555689502-c4b22d76c56f', .5, .55, 1.0, subject='Person wearing mid wash slim tapered jeans'), P('1555689502-c4b22d76c56f', .5, .45, 1.8, subject='Mid wash jeans - detail crop')], True),
    ('ribbed-beanie', 'Black', 'Black', [P('1576871337632-b9aef4c17ab9', .38, .32, 2.2, subject='Black rib-knit beanie laid flat (crop of beanie flat lay)'), P('1576871337632-b9aef4c17ab9', .5, .5, 1.0, subject='Flat lay of rib-knit beanies in black, pink, yellow and green')], True),
    ('cuff-beanie', 'Pink', 'Pink', [P('1576871337632-b9aef4c17ab9', .67, .55, 2.0, subject='Pink cuffed rib-knit beanie (crop of beanie flat lay)'), P('1576871337632-b9aef4c17ab9', .5, .5, 1.0, subject='Flat lay of rib-knit beanies in black, pink, yellow and green')], True),
    ('cuff-beanie', 'Yellow', 'Yellow', [P('1576871337632-b9aef4c17ab9', .28, .98, 2.8, subject='Yellow cuffed rib-knit beanie (crop of beanie flat lay)'), P('1576871337632-b9aef4c17ab9', .5, .5, 1.0, subject='Flat lay of rib-knit beanies in black, pink, yellow and green')], True),
    ('trucker-cap', 'White', 'White', [P('1588850561407-ed78c282e89b', .5, .5, 1.0, mode='pad', subject='White mesh trucker cap on white'), P('1588850561407-ed78c282e89b', .5, .5, 1.7, subject='White trucker cap - detail crop')], True),
    ('fleece-pant', 'Grey Heather', 'Grey', [P('1602573991155-21f0143bb45c', .5, .5, 1.0, mode='pad', subject='Person wearing grey heather straight-leg sweatpants'), P('1588117305388-c2631a279f82', .5, .65, 1.0, subject='Woman wearing grey sweatpants, crouching')], True),
    ('sherpa-trucker', 'Dark Wash', 'Blue', [P('1544923246-77307dd654cb', .5, .5, 1.0, subject='Man wearing a dark wash sherpa lined denim jacket'), P('1544923246-77307dd654cb', .5, .45, 1.8, subject='Sherpa collar - detail crop')], True),
    ('pigment-tee', 'Lilac', 'Purple', [P('1622470953794-aa9c70b0fb9d', .5, .5, 1.0, subject='Man wearing a faded lilac t-shirt with small chest print'), P('1622470953794-aa9c70b0fb9d', .5, .5, 1.8, subject='Pink pigment dyed tee - detail crop')], True),
    ('cat-eye-sunglasses', 'Champagne', 'Gold', [P('1508296695146-257a814070b4', .55, .5, 1.0, subject='Champagne metal cat-eye sunglasses with gradient lenses'), P('1508296695146-257a814070b4', .55, .45, 1.6, subject='Cat-eye sunglasses - detail crop')], True),
    ('leather-backpack', 'Cognac', 'Brown', [P('1622560480605-d83c853bc5c3', .5, .55, 1.0, subject='Cognac leather backpack on a plain backdrop'), P('1622560480605-d83c853bc5c3', .5, .55, 1.8, subject='Leather backpack - detail crop of front pocket')], True),
    ('piped-tee', 'Black', 'Black', [P('1622519407650-3df9883f76a5', .5, .5, 1.0, subject='Man wearing a black t-shirt with contrast piping'), P('1622519407650-3df9883f76a5', .5, .45, 1.7, subject='Contrast piping tee - detail crop')], True),
    ('suede-overshirt', 'Tan', 'Brown', [P('1617114919297-3c8ddb01f599', .5, .45, 1.0, subject='Man wearing a tan suede overshirt'), P('1617114919297-3c8ddb01f599', .5, .35, 1.9, subject='Suede overshirt - detail crop')], True),
    ('bifold-wallet', 'Brown', 'Brown', [P('1627123424574-724758594e93', .5, .5, 1.0, subject='Brown leather bifold wallet'), P('1627123424574-724758594e93', .5, .5, 1.7, subject='Leather bifold wallet - detail crop')], True),
    ('heart-tee', 'White', 'White', [P('1613852348851-df1739db8201', .5, .5, 1.0, subject='Man wearing a white t-shirt with a small black heart print'), P('1613852348851-df1739db8201', .5, .45, 1.8, subject='Heart print - detail crop')], True),
    # --- rest of the catalogue (not in New Arrivals) ---
    ('heavyweight-hoodie', 'Orange', 'Orange', [P('1509942774463-acf339cf87d5', .5, .5, 1.0, subject='Man wearing an orange pullover hoodie'), P('1509942774463-acf339cf87d5', .52, .62, 1.8, subject='Orange hoodie - detail crop')], False),
    ('crew-sweat', 'Pink', 'Pink', [P('1516826957135-700dedea698c', .5, .4, 1.0, subject='Man wearing a pale pink crewneck sweatshirt'), P('1516826957135-700dedea698c', .45, .3, 1.8, subject='Pink crewneck - detail crop')], False),
    ('rider-jacket', 'Brown', 'Brown', [P('1487222477894-8943e31ef7b2', .5, .5, 1.0, subject='Man wearing a brown leather rider jacket'), P('1614252369475-531eba835eb1', .5, .5, 1.0, subject='Man wearing a brown leather jacket, close up')], False),
    ('washed-trucker', 'Light Wash', 'Blue', [P('1495105787522-5334e3ffa0ef', .5, .5, 1.0, subject='Light stonewash denim jacket worn over a white tee'), P('1517841905240-472988babdf9', .5, .5, 1.0, subject='Woman wearing a light denim jacket over a grey hoodie')], False),
    ('dot-shirt', 'Chambray', 'Blue', [P('1596755094514-f87e34085b2c', .5, .5, 1.0, subject='Chambray dot print long-sleeve shirt on a hanger'), P('1596755094514-f87e34085b2c', .5, .45, 1.8, subject='Chambray dot shirt - detail crop')], False),
    ('oxford-shirt', 'Light Blue', 'Blue', [P('1589310243389-96a5483213a8', .5, .45, 1.0, subject='Man wearing a light blue oxford shirt'), P('1589310243389-96a5483213a8', .5, .4, 1.8, subject='Oxford shirt - detail crop')], False),
    ('cable-cardigan', 'Forest', 'Green', [P('1580331451062-99ff652288d7', .5, .5, 1.0, subject='Woman wearing a long forest green chunky knit sweater'), P('1580331451062-99ff652288d7', .5, .45, 1.8, subject='Cable knit - detail crop')], False),
    ('distressed-jean', 'Light Wash', 'Blue', [P('1582552938357-32b906df40cb', .5, .5, 1.0, subject='Person wearing light wash jeans'), P('1582552938357-32b906df40cb', .5, .55, 1.8, subject='Light wash jeans - detail crop')], False),
    ('pleated-trouser', 'Khaki', 'Natural', [P('1614251055880-ee96e4803393', .5, .55, 1.0, subject='Woman wearing wide leg pleated khaki trousers'), P('1614251055880-ee96e4803393', .5, .65, 1.8, subject='Pleated trouser - detail crop')], False),
    ('stripe-short', 'Grey Stripe', 'Grey', [P('1598522325074-042db73aa4e6', .5, .6, 1.0, subject='Woman wearing grey and white striped pull-on shorts'), P('1598522325074-042db73aa4e6', .5, .7, 1.8, subject='Striped shorts - detail crop')], False),
    ('embroidered-cap', 'Sand', 'Natural', [P('1575428652377-a2d80e2277fc', .5, .3, 1.35, subject='Sand cotton cap with ice cream cone embroidery, worn'), P('1575428652377-a2d80e2277fc', .5, .3, 1.6, subject='Embroidered cap - detail crop')], False),
    ('wool-beanie', 'Brown', 'Brown', [P('1610384104075-e05c8cf200c3', .45, .4, 1.0, subject='Man wearing a brown knit watch cap'), P('1610384104075-e05c8cf200c3', .45, .2, 1.9, subject='Brown watch cap - detail crop')], False),
    ('acetate-sunglasses', 'Clear / Brown', 'Brown', [P('1577803645773-f96470509666', .5, .5, 1.0, subject='Clear acetate sunglasses with brown lenses'), P('1577803645773-f96470509666', .5, .5, 1.6, subject='Acetate sunglasses - detail crop')], False),
    ('canvas-backpack', 'Navy', 'Blue', [P('1553062407-98eeb64c6a62', .5, .5, 1.0, subject='Navy canvas backpack'), P('1553062407-98eeb64c6a62', .45, .5, 1.6, subject='Canvas backpack - detail crop')], False),
    ('crossbody-bag', 'White', 'White', [P('1604176424472-17cd740f74e9', .5, .5, 1.0, subject='White leather crossbody bag hanging on a hook'), P('1604176424472-17cd740f74e9', .5, .62, 1.7, subject='Crossbody bag - detail crop')], False),
    ('heavyweight-tee', 'Sky', 'Blue', [P('1564584217132-2271feaeb3c5', .5, .5, 1.0, subject='Pale blue plain t-shirt on a hanger'), P('1564584217132-2271feaeb3c5', .5, .45, 1.8, subject='Pale blue tee - detail crop')], False),
]

# Editorial callouts in the collection grids and homepage campaign blocks
EDITORIAL = [
    dict(file='editorial/campaign-01.jpg', src='1550246140-29f40b909e5a', ratio='4:3', fx=.5, fy=.5, zoom=1.0, gray=True, subject='Person in a white hoodie crouching against a painted wall (greyscale)', use='Homepage campaign block 1'),
    dict(file='editorial/campaign-02.jpg', src='1529139574466-a303027c1d8b', ratio='4:5', fx=.5, fy=.45, subject='Woman in sunglasses, red tee and black jacket', use='Homepage campaign block 2'),
    dict(file='editorial/campaign-03.jpg', src='1552374196-1ab2a1c593e8', ratio='4:5', fx=.5, fy=.5, subject='Man seated on a stool in a tan jacket and white trousers', use='Homepage campaign block 3'),
    dict(file='editorial/campaign-04.jpg', src='1515886657613-9f3515b0c78f', ratio='4:5', fx=.5, fy=.5, subject='Woman in a yellow fleece hoodie and sweatpants on a court', use='Homepage campaign block 4'),
    dict(file='editorial/callout-01.jpg', src='1517841905240-472988babdf9', ratio='2:3', fx=.5, fy=.5, subject='Woman in a denim jacket over a grey hoodie', use='New Arrivals grid callout 1'),
    dict(file='editorial/callout-02.jpg', src='1504593811423-6dd665756598', ratio='2:3', fx=.5, fy=.5, subject='Man in a vest and shirt on a street corner', use='New Arrivals grid callout 2'),
    dict(file='editorial/callout-03.jpg', src='1601333144130-8cbb312386b6', ratio='2:3', fx=.5, fy=.5, subject='Man in a grey beanie and light denim jacket on a city street', use='New Arrivals grid callout 3'),
    dict(file='editorial/callout-04.jpg', src='1619042821874-587aa4335f39', ratio='2:3', fx=.6, fy=.5, subject='Man in a cap and white sweatshirt with a backpack', use='New Arrivals grid callout 4'),
    dict(file='editorial/callout-05.jpg', src='1559582798-678dfc71ccd8', ratio='2:3', fx=.5, fy=.5, subject='Man walking in a camel coat carrying a holdall', use='New Arrivals grid callout 5'),
]
CATEGORY_IMAGES = {
    'tees': ('1523381210434-271e8be1f52b', 'Row of t-shirts on wooden hangers', .5, .5),
    'outerwear': ('1559551409-dadc959f76b8', 'Shearling and leather jackets hanging on a brick wall', .5, .5),
    'beanies': ('1576871337632-b9aef4c17ab9', 'Flat lay of rib-knit beanies', .5, .5),
    'headwear': ('1622445275463-afa2ab738c34', 'Man in a white cap and white tee', .5, .5),
    'knits': ('1624623278313-a930126a11c3', 'Stack of folded cream knitwear', .5, .5),
    'sweats': ('1588117305388-c2631a279f82', 'Woman in grey sweatpants crouching', .5, .5),
    'tops-shirts': ('1607345366928-199ea26cfe3e', 'Man in a mustard plaid flannel shirt', .5, .5),
    'bottoms': ('1599012307530-d163bd04ecab', 'Wall display of trousers, shirts and boots', .5, .5),
    'denim': ('1604176354204-9268737828e4', 'Stack of folded denim jeans', .5, .5),
    'sunglasses': ('1511499767150-a48a237f0083', 'Round metal sunglasses on white', .5, .5),
    'accessories': ('1622560480605-d83c853bc5c3', 'Cognac leather backpack', .5, .5),
    'archive': ('1558769132-cb1aea458c5e', 'Rail of neutral-toned clothing', .5, .5),
}

COLLECTIONS = [
    ('new-arrivals', 'New Arrivals'), ('tees', 'Tees'), ('outerwear', 'Outerwear'), ('beanies', 'Beanies'),
    ('headwear', 'Headwear'), ('knits', 'Knits'), ('sweats', 'Sweats'), ('tops-shirts', 'Tops & Shirts'),
    ('bottoms', 'Bottoms'), ('denim', 'Denim'), ('sunglasses', 'Sunglasses'), ('accessories', 'Accessories'),
]

def slug(s):
    return ''.join(c if c.isalnum() else '-' for c in s.lower()).strip('-').replace('--', '-').replace('--', '-')

def main():
    images, products = [], []
    for i, (fam, colour, group, photos, new) in enumerate(PRODUCTS):
        f = FAMILIES[fam]
        handle = f'{fam}-{slug(colour)}'
        files = []
        for j, ph in enumerate(photos):
            fn = f'products/{handle}-{j + 1}.jpg'
            spec = {k: v for k, v in ph.items() if k != 'subject'}
            images.append(dict(file=fn, use=f"{f['name']} - {colour} (image {j + 1})", subject=ph['subject'], **spec))
            files.append('/images/' + fn)
        # deterministic sold-out sizes for realism
        sold = [s for k, s in enumerate(f['sizes']) if len(f['sizes']) > 1 and (i * 7 + k * 3) % 11 == 0]
        products.append(dict(
            handle=handle, family=fam, title=f['name'], colour=colour, colourGroup=group,
            category=f['category'], price=f['price'], sizes=f['sizes'], soldOut=sold,
            newArrival=new, position=i, images=files, description=f['desc'], details=f['details'],
        ))
    for e in EDITORIAL:
        images.append(dict(e, use=e['use']))
    for cat, (src, subj, fx, fy) in CATEGORY_IMAGES.items():
        images.append(dict(file=f'categories/{cat}.jpg', src=src, ratio='2:3', fx=fx, fy=fy, zoom=1.0, subject=subj, use=f'Category callout - {cat}'))
    json.dump(images, open(os.path.join(ROOT, 'scripts', 'images.json'), 'w'), indent=1)
    os.makedirs(os.path.join(ROOT, 'src', 'data'), exist_ok=True)
    json.dump(dict(products=products, collections=[dict(handle=h, title=t) for h, t in COLLECTIONS],
                   categoryImages={k: f'/images/categories/{k}.jpg' for k in CATEGORY_IMAGES},
                   callouts=[e['file'] for e in EDITORIAL if e['file'].startswith('editorial/callout')]),
              open(os.path.join(ROOT, 'src', 'data', 'catalog.json'), 'w'), indent=1)
    print(len(products), 'products,', sum(p['newArrival'] for p in products), 'new arrivals,', len(images), 'images')

if __name__ == '__main__':
    main()
